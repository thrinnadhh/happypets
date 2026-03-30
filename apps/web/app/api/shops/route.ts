/**
 * Shop Management API Route
 * GET: Fetch the shop associated with the currently authenticated admin
 * PATCH: Update shop details (Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shopSchema, UserRole } from '@happypets/shared';
import { rateLimit, cacheClient } from '@/lib/redis';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:shops');
const SHOP_CACHE_PREFIX = 'shops:id:';

/**
 * GET /api/shops
 * Get current admin's shop details
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const supabase = createClient();
    
    // Get shop ID from user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('shop_id')
      .eq('user_id', user.user_id)
      .single();

    if (profileError || !profile || !profile.shop_id) {
      return NextResponse.json(
        { error: 'Admin shop not found', code: 'SHOP_NOT_FOUND' },
        { status: 404 }
      );
    }

    const shopId = profile.shop_id;
    const cacheKey = `${SHOP_CACHE_PREFIX}${shopId}`;

    // Check cache
    const cached = await cacheClient.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for shop: ${shopId}`);
      return NextResponse.json(JSON.parse(cached as string));
    }

    // Fetch shop details
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { error: 'Shop not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Cache for 30 minutes
    await cacheClient.set(cacheKey, JSON.stringify(shop), { ex: 1800 });
    await cacheClient.set(`${SHOP_CACHE_PREFIX}${shop.slug}`, JSON.stringify(shop), { ex: 1800 });

    return NextResponse.json(shop);
  } catch (error) {
    logger.error('Error in GET /api/shops:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/shops
 * Update current admin's shop details
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const supabase = createClient();
    
    // Get shop ID from user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('shop_id')
      .eq('user_id', user.user_id)
      .single();

    if (profileError || !profile || !profile.shop_id) {
      return NextResponse.json(
        { error: 'Admin shop not found', code: 'SHOP_NOT_FOUND' },
        { status: 404 }
      );
    }

    const shopId = profile.shop_id;
    const body = await request.json();
    const validatedData = shopSchema.partial().parse(body);

    // Handle branding updates (logo/cover)
    if (body.logoBase64) {
      try {
        const { data: shop } = await supabase.from('shops').select('slug').eq('id', shopId).single();
        if (shop) {
          validatedData.logo_url = await uploadToCloudinary(body.logoBase64, `shops/${shop.slug}/logo`);
        }
      } catch (e) {
        logger.error('Logo upload failed:', e);
      }
    }

    // Update shop
    const { data: updatedShop, error: updateError } = await supabase
      .from('shops')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shopId)
      .select()
      .single();

    if (updateError || !updatedShop) {
      logger.error('Shop update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update shop', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Bust cache
    await cacheClient.del(`${SHOP_CACHE_PREFIX}${shopId}`);
    await cacheClient.del(`${SHOP_CACHE_PREFIX}${updatedShop.slug}`);
    
    // Bust browse cache
    const browseKeys = await cacheClient.keys('shops:browse:*');
    if (browseKeys.length > 0) {
      await cacheClient.del(...browseKeys);
    }

    logger.info(`Shop updated: ${shopId} by ${user.user_id}`);
    return NextResponse.json(updatedShop);
  } catch (error) {
    logger.error('Error in PATCH /api/shops:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
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
