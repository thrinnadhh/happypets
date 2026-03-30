/**
 * Shared utility functions for the web app
 */

import { createHash } from 'crypto';

/**
 * Generate URL-safe slug from text
 * @example generateSlug("My Product Name") → "my-product-name"
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Remove multiple hyphens
};

/**
 * Hash object to generate cache key
 * @example hashObject({ a: 1, b: 2 }) → "abc123..."
 */
export const hashObject = (obj: Record<string, any>): string => {
  const str = JSON.stringify(obj);
  return createHash('sha256').update(str).digest('hex').slice(0, 16);
};

/**
 * Truncate text to specified length with ellipsis
 * @example truncateText("Hello world", 5) → "He..."
 */
export const truncateText = (text: string, length: number): string => {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
};

/**
 * Check if date is expiring soon (within 30 days)
 */
export const isExpiringSoon = (expiryDate: string): boolean => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  return expiry <= thirtyDaysFromNow && expiry > now;
};

/**
 * Check if date has expired
 */
export const isExpired = (expiryDate: string): boolean => {
  return new Date(expiryDate) < new Date();
};

/**
 * Get stock status label
 */
export const getStockStatus = (quantity: number): 'in_stock' | 'low_stock' | 'out_of_stock' => {
  if (quantity === 0) return 'out_of_stock';
  if (quantity < 10) return 'low_stock';
  return 'in_stock';
};

/**
 * Calculate shipping cost
 * Free for orders >= ₹499, ₹49 otherwise
 */
export const calculateShipping = (subtotal: number): number => {
  return subtotal >= 49900 ? 0 : 4900; // In paise
};

/**
 * Calculate order total with tax and discount
 */
export const calculateOrderTotal = (
  subtotal: number,
  discount: number = 0,
  shipping: number = 0,
  tax: number = 0
): number => {
  return subtotal - discount + shipping + tax;
};

/**
 * Get discount amount
 */
export const getDiscountedPrice = (
  original: number,
  discountPercent: number
): number => {
  return Math.round(original * (1 - discountPercent / 100));
};

/**
 * Get savings amount
 */
export const getSavingsAmount = (
  original: number,
  discountPercent: number
): number => {
  return Math.round(original * (discountPercent / 100));
};

/**
 * Format duration (e.g., "2 days ago")
 */
export const formatDuration = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000; // Years
  if (interval > 1) return Math.floor(interval) + ' years ago';

  interval = seconds / 2592000; // Months
  if (interval > 1) return Math.floor(interval) + ' months ago';

  interval = seconds / 86400; // Days
  if (interval > 1) return Math.floor(interval) + ' days ago';

  interval = seconds / 3600; // Hours
  if (interval > 1) return Math.floor(interval) + ' hours ago';

  interval = seconds / 60; // Minutes
  if (interval > 1) return Math.floor(interval) + ' minutes ago';

  return 'just now';
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Parse query string to object
 */
export const parseQueryString = (queryString: string): Record<string, string> => {
  const params = new URLSearchParams(queryString);
  const obj: Record<string, string> = {};

  params.forEach((value, key) => {
    obj[key] = value;
  });

  return obj;
};

/**
 * Build query string from object
 */
export const buildQueryString = (obj: Record<string, any>): string => {
  const params = new URLSearchParams();

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });

  return params.toString();
};

/**
 * Validate email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone (Indian format)
 */
export const isValidPhone = (phone: string): boolean => {
  return /^[0-9]{10}$/.test(phone.replace(/\D/g, ''));
};

/**
 * Format phone number
 * @example formatPhoneNumber("9876543210") → "+91 98765 43210"
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{5})(\d{5})$/);
  if (match) {
    return `+${match[1]} ${match[2]} ${match[3]}`;
  }
  return phone;
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};
