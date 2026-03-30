/**
 * Shared TypeScript types and interfaces
 * Used across web (Next.js) and mobile (Expo) apps
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  UPI = 'upi',
  CARD = 'card',
  NETBANKING = 'netbanking',
  WALLET = 'wallet',
  EMI = 'emi',
}

export enum NotificationType {
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  PRODUCT_RESTOCKED = 'product_restocked',
  WISHLIST_DISCOUNT = 'wishlist_discount',
  ADMIN_SUSPENDED = 'admin_suspended',
  REVIEW_POSTED = 'review_posted',
}

export enum ProductCategory {
  DOG_FOOD = 'dog_food',
  CAT_FOOD = 'cat_food',
  BIRD_FOOD = 'bird_food',
  HAMSTER_FOOD = 'hamster_food',
}

export enum StockStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
}

// ============================================================================
// CORE ENTITIES
// ============================================================================

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  logo_url?: string;
  banner_url?: string;
  verified: boolean;
  verified_at?: string;
  suspended: boolean;
  suspended_at?: string;
  suspension_reason?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  shop_id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  brand_id?: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  category: ProductCategory;
  sub_category?: string;
  sku: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  image_urls: string[];
  featured_image_url: string;
  stock_quantity: number;
  rating?: number;
  review_count?: number;
  published: boolean;
  featured: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  coupon_code?: string;
  shipping_address: Address;
  billing_address: Address;
  notes?: string;
  created_at: string;
  updated_at: string;
  delivered_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  shop_id: string;
  brand_id?: string;
  quantity: number;
  price_at_purchase: number;
  discount_applied?: number;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses?: number;
  uses_count: number;
  min_purchase_amount?: number;
  applicable_categories: ProductCategory[];
  applicable_brands: string[];
  valid_from: string;
  valid_until: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  added_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_id?: string;
  read: boolean;
  created_at: string;
}

export interface Address {
  full_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_default: boolean;
}

export interface CartItem {
  product_id: string;
  quantity: number;
  price: number;
  discount_percentage?: number;
}

// ============================================================================
// COMPOSITE TYPES
// ============================================================================

export interface ProductWithBrand extends Product {
  brand?: Brand;
  shop?: Shop;
  reviews?: Review[];
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface ShopWithProducts extends Shop {
  products_count: number;
  featured_products: Product[];
}

export interface FeaturedSection {
  id: string;
  title: string;
  slug: string;
  type: 'recommended' | 'trending' | 'sale' | 'new_arrivals';
  description?: string;
  product_ids: string[];
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  total_customers: number;
  top_products: Product[];
  recent_orders: Order[];
  sales_by_category: Record<ProductCategory, number>;
}

export interface AdminDashboardStats extends DashboardStats {
  shop_id: string;
  total_products: number;
  low_stock_products: Product[];
  pending_reviews: Review[];
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone: string;
}

export interface AuthResponse {
  user: Profile;
  access_token: string;
  refresh_token: string;
}

// ============================================================================
// CONTEXT & STATE TYPES
// ============================================================================

export interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

export interface CartContextType {
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}
