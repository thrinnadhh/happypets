export type Role = "customer" | "admin" | "superadmin";

export type ProductCategory = "Dog" | "Cat" | "Fish";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  approved: boolean;
};

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  brand: string;
  image: string;
  gallery?: string[];
  description: string;
  quantity: number;
  price: number;
  discount?: number;
  manufactureDate: string;
  expiryDate: string;
  soldCount: number;
  revenue: number;
  rating: number;
};

export type AdminRecord = {
  id: string;
  name: string;
  email: string;
  status: "Approved" | "Active" | "Pending";
  leaveDays: number;
  lastLogin: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
};
