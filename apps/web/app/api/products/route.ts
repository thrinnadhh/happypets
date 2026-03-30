/**
 * Products API Route
 * GET: Public, cached product listing with filters
 * POST: Admin only, create new product
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { productSchema } from '@happypets/shared';
import { UserRole, UserStatus } from '@happypets/shared';
import { rateLimit, getCachedProducts, setCachedProducts, bustProductCacheForShop } from '@/lib/redis';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { generateSlug, hashObject } from '@/lib/utils';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:products');

/**
 * GET /api/products
 * Fetch products with filters, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 100, 60);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const shop = searchParams.get('shop') || undefined;
    const brand = searchParams.get('brand') || undefined;
    const search = searchParams.get('search') || undefined;
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const isFeatured = searchParams.get('featured') === 'true';
    const isTrending = searchParams.get('trending') === 'true';

    // Generate cache key
    const cacheKey = {
      category,
      shop,
      brand,
      search,
      sort,
      page,
      limit,
      tags,
      featured: isFeatured,
      trending: isTrending,
    };
    const cacheHash = hashObject(cacheKey);
    const fullCacheKey = `products:${cacheHash}`;

    // Check cache
    const cached = await getCachedProducts<any>(cacheHash);

    if (cached) {
      logger.debug(`Cache hit for products: ${fullCacheKey}`);
      return NextResponse.json(cached);
    }

    const supabase = createClient();

    // Build base query
    let query = supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        description,
        short_description,
        category,
        sub_category,
        sku,
        price,
        original_price,
        discount_percentage,
        image_urls,
        featured_image_url,
        stock_quantity,
        rating,
        review_count,
        is_featured,
        is_trending,
        featured_order,
        trending_order,
        published,
        created_at,
        updated_at,
        brands (
          id,
          name,
          slug,
          logo_url
        ),
        shops (
          id,
          name,
          slug,
          display_name
        )
      `,
        { count: 'exact' }
      )
      .eq('is_active', true)
      .eq('published', true)
      .gt('expiry_date', new Date().toISOString());

    // Apply filters
    if (category) query = query.eq('category', category);
    if (shop) query = query.eq('shops.slug', shop);
    if (brand) query = query.eq('brands.slug', brand);
    if (isFeatured) query = query.eq('is_featured', true);
    if (isTrending) query = query.eq('is_trending', true);
    if (tags && tags.length > 0) {
      query = query.contains('tags', tags);
    }

    // Search in name, description, short_description
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(
        `name.ilike.${searchTerm},description.ilike.${searchTerm},short_description.ilike.${searchTerm}`
      );
    }

    // Sort order
    const sortConfig = getSortOrder(sort);
    query = query.order(sortConfig.column, { ascending: sortConfig.ascending });

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: products, count, error } = await query;

    if (error) {
      logger.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    const response = {
      products: products || [],
      total,
      page,
      totalPages,
      hasMore,
    };

    // Cache response
    await setCachedProducts(cacheHash, response, 300); // 5 minutes

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error in GET /api/products:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create new product (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 50, 60);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    // Check authentication
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (user.status !== UserStatus.APPROVED) {
      return NextResponse.json(
        { error: 'Admin not approved', code: 'NOT_APPROVED' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = productSchema.parse(body);

    // Handle image upload
    let imageUrls = validatedData.image_urls || [];
    let featuredImageUrl = validatedData.featured_image_url;

    if (body.imageBase64) {
      try {
        const cloudinaryUrl = await uploadToCloudinary(
          body.imageBase64,
          `products/${validatedData.sku}`
        );
        imageUrls = [cloudinaryUrl, ...imageUrls];
        if (!featuredImageUrl || featuredImageUrl.includes('placeholder')) {
          featuredImageUrl = cloudinaryUrl;
        }
      } catch (error) {
        logger.error('Image upload failed:', error);
        return NextResponse.json(
          { error: 'Image upload failed', code: 'UPLOAD_ERROR' },
          { status: 400 }
        );
      }
    }

    // Generate unique slug
    const baseSlug = generateSlug(validatedData.name);
    let slug = baseSlug;
    let counter = 2;

    const supabase = createClient();

    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        // Slug is unique
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Get admin's shop
    const { data: adminProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('shop_id')
      .eq('user_id', user.user_id)
      .single();

    if (profileError || !adminProfile || !adminProfile.shop_id) {
      return NextResponse.json(
        { error: 'Admin shop not found', code: 'SHOP_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Create product
    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        ...validatedData,
        slug,
        image_urls: imageUrls,
        featured_image_url: featuredImageUrl,
        shop_id: adminProfile.shop_id,
        admin_id: user.user_id,
        is_active: true,
        published: true, // Default to published
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !product) {
      logger.error('Product creation failed:', insertError);
      return NextResponse.json(
        { error: 'Failed to create product', code: 'CREATE_ERROR' },
        { status: 500 }
      );
    }

    // Bust cache
    await bustProductCacheForShop(adminProfile.shop_id);

    // Create notification for superadmin
    try {
      await supabase.from('notifications').insert({
        type: 'PRODUCT_ADDED',
        title: 'New Product Added',
        message: `New product "${validatedData.name}" added by ${user.full_name}`,
        related_entity_id: product.id,
        target_role: UserRole.SUPERADMIN,
      });
    } catch (error) {
      logger.warn('Failed to create notification:', error);
    }

    logger.info(`Product created: ${product.id} by ${user.user_id}`);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/products:', error);

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Helper: Get Supabase order clause based on sort param
 */
function getSortOrder(sort: string) {
  switch (sort) {
    case 'price_asc':
      return { column: 'price', ascending: true };
    case 'price_desc':
      return { column: 'price', ascending: false };
    case 'rating':
      return { column: 'rating', ascending: false };
    case 'discount':
      return { column: 'discount_percentage', ascending: false };
    case 'featured':
      return { column: 'featured_order', ascending: true };
    case 'trending':
      return { column: 'trending_order', ascending: true };
    case 'newest':
    default:
      return { column: 'created_at', ascending: false };
  }
}
