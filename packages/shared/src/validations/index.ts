/**
 * Shared Zod validation schemas
 * Used across web (Next.js) and mobile (Expo) apps
 */

import { z } from 'zod';
import { UserRole, PaymentMethod, ProductCategory } from '../types/index.js'; // fixed import

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().regex(/^[0-9]{10}$/, 'Invalid phone number'),
    agree_terms: z.boolean().refine((val) => val, {
      message: 'You must agree to the terms',
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(6),
    new_password: z.string().min(8),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

// ============================================================================
// PRODUCT SCHEMAS
// ============================================================================

export const productSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  slug: z.string().min(3),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  short_description: z.string().max(200).optional(),
  category: z.enum([
    ProductCategory.DOG_FOOD,
    ProductCategory.CAT_FOOD,
    ProductCategory.BIRD_FOOD,
    ProductCategory.HAMSTER_FOOD,
  ]),
  sub_category: z.string().optional(),
  sku: z.string().min(3),
  price: z.number().positive('Price must be positive'),
  original_price: z.number().positive().optional(),
  discount_percentage: z.number().min(0).max(100).optional(),
  image_urls: z.array(z.string().url()).min(1, 'At least one image required'),
  featured_image_url: z.string().url(),
  stock_quantity: z.number().nonnegative('Stock cannot be negative'),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
});

export const productUpdateSchema = productSchema.partial();

export const brandSchema = z.object({
  name: z.string().min(2, 'Brand name must be at least 2 characters'),
  slug: z.string().min(2),
  description: z.string().optional(),
  logo_url: z.string().url().optional(),
  website: z.string().url().optional(),
});

// ============================================================================
// ORDER & CHECKOUT SCHEMAS
// ============================================================================

export const addressSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().regex(/^[0-9]{10}$/),
  street: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  zip_code: z.string().regex(/^[0-9]{6}$/),
  country: z.string().default('India'),
  is_default: z.boolean().default(false),
});

export const checkoutSchema = z.object({
  cart_items: z.array(
    z.object({
      product_id: z.string(),
      quantity: z.number().positive(),
    })
  ),
  shipping_address: addressSchema,
  billing_address: addressSchema.optional(),
  coupon_code: z.string().optional(),
  payment_method: z.enum([
    PaymentMethod.UPI,
    PaymentMethod.CARD,
    PaymentMethod.NETBANKING,
    PaymentMethod.WALLET,
  ]),
  notes: z.string().max(500).optional(),
});

export const paymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

export const reviewSchema = z.object({
  product_id: z.string(),
  rating: z.number().min(1).max(5),
  title: z.string().min(5).max(100).optional(),
  comment: z.string().min(10).max(1000),
});

export const reviewUpdateSchema = reviewSchema.partial();

// ============================================================================
// COUPON SCHEMAS
// ============================================================================

export const couponSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive(),
  max_uses: z.number().positive().optional(),
  min_purchase_amount: z.number().nonnegative().optional(),
  applicable_categories: z.array(z.string()).optional(),
  applicable_brands: z.array(z.string()).optional(),
  valid_from: z.string().datetime(),
  valid_until: z.string().datetime(),
  active: z.boolean().default(true),
});

export const applyCouponSchema = z.object({
  code: z.string(),
  cart_total: z.number().positive(),
});

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const createShopSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  description: z.string().optional(),
  logo_url: z.string().url().optional(),
  banner_url: z.string().url().optional(),
});

export const updateShopSchema = createShopSchema.partial();

export const featuredSectionSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  type: z.enum(['recommended', 'trending', 'sale', 'new_arrivals']),
  description: z.string().optional(),
  product_ids: z.array(z.string()).min(1),
  position: z.number().nonnegative(),
  active: z.boolean().default(true),
});

// ============================================================================
// SUPERADMIN SCHEMAS
// ============================================================================

export const suspendAdminSchema = z.object({
  admin_id: z.string(),
  reason: z.string().min(10),
});

export const createAdminSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirm_password: z.string(),
    full_name: z.string().min(2),
    phone: z.string().regex(/^[0-9]{10}$/),
    shop_id: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

// ============================================================================
// EXPORT TYPE INFERENCES
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type BrandInput = z.infer<typeof brandSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type CreateShopInput = z.infer<typeof createShopSchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;
export type FeaturedSectionInput = z.infer<typeof featuredSectionSchema>;
export type SuspendAdminInput = z.infer<typeof suspendAdminSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
