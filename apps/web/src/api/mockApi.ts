import axios from "axios";
import { LoginPayload, Product, Role, User } from "@/types";

export const apiClient = axios.create({
  baseURL: "/mock-api",
  timeout: 800,
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildUserFromEmail = (email: string): User => {
  const normalized = email.toLowerCase();
  let role: Role = "customer";
  let approved = true;

  if (normalized.includes("super")) {
    role = "superadmin";
  } else if (normalized.includes("admin")) {
    role = "admin";
    approved = !normalized.includes("pending");
  }

  return {
    id: normalized.replace(/[^a-z0-9]/g, "-"),
    name: normalized.split("@")[0].replace(/[.-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    email,
    role,
    approved,
  };
};

export async function loginRequest(payload: LoginPayload): Promise<{ user: User; token: string }> {
  await delay(700);

  if (!payload.email || !payload.password) {
    throw new Error("Email and password are required.");
  }

  const user = buildUserFromEmail(payload.email);

  apiClient.defaults.headers.common.Authorization = `Bearer mock-${user.role}`;

  return {
    user,
    token: `mock-token-${user.role}`,
  };
}

export async function fetchProducts(products: Product[]): Promise<Product[]> {
  await delay(350);
  return products;
}
