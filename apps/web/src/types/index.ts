export type Role = "customer" | "admin" | "superadmin";

export type ProductCategory = "Dog" | "Cat" | "Fish" | "Hamster" | "Rabbit" | "Birds";

export type DisplaySection = "Home" | ProductCategory;

export type ProductTag = "recommended" | "trending" | "popular";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  approved: boolean;
};

export type Product = {
  id: string;
  shopId?: string;
  name: string;
  category: ProductCategory;
  lifeStage?: string;
  displaySection: DisplaySection;
  position: number;
  tags?: ProductTag[];
  brand: string;
  image: string;
  gallery?: string[];
  description: string;
  quantity: number;
  price: number;
  discount?: number;
  weight: string;
  packetCount: number;
  isSample: boolean;
  createdAt?: string;
  manufactureDate: string;
  expiryDate: string;
  soldCount: number;
  revenue: number;
  rating: number;
};

export type Banner = {
  id: string;
  imageUrl: string;
  position: number;
};

export type AdminRecord = {
  id: string;
  name: string;
  email: string;
  status: "Approved" | "Active" | "Pending" | "Rejected" | "Revoked";
  leaveDays: number;
  lastLogin: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupRole = "customer" | "admin";

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  role: SignupRole;
};

export type SignupResult = {
  user: User | null;
  requiresEmailVerification: boolean;
  message?: string;
};

export type CartItem = {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  selected: boolean;
};

export type CouponResult = {
  code: string;
  description: string;
  discountAmount: number;
};

export type DeliveryAddressSuggestion = {
  id: string;
  address: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
};

export type DeliveryQuote = {
  deliveryQuoteId: string;
  shopId: string;
  normalizedAddress: string;
  destinationLat: number;
  destinationLng: number;
  distanceMeters: number;
  durationSeconds: number;
  deliveryFeeInr: number;
  serviceable: boolean;
  expiresAt: string;
};

export type AdminDeliveryConfig = {
  shopId: string;
  shopName: string;
  originAddress: string;
  originLat: number | null;
  originLng: number | null;
  baseFeeInr: number;
  includedDistanceKm: number;
  extraPerKmInr: number;
  maxServiceDistanceKm: number;
  isActive: boolean;
};

export type AdminCoupon = {
  id: string;
  code: string;
  description: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrderInr: number;
  maxDiscountInr: number | null;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
};

export type CheckoutDetails = {
  address: string;
  mobileNumber: string;
  deliveryTime: string;
  deliveryQuoteId: string;
  destinationLat: number;
  destinationLng: number;
};

export type OrderItem = {
  productId: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isSample: boolean;
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  address: string;
  mobileNumber: string;
  deliveryTime: string;
  createdAt: string;
};
