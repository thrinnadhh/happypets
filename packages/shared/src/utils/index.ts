/**
 * Shared utility functions
 * Pure functions usable in both web and mobile apps
 */

// ============================================================================
// PRICE FORMATTING
// ============================================================================

/**
 * Format number as Indian Rupee with commas
 * @example formatPrice(12345.67) → "₹12,345.67"
 */
export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format price for display (without currency symbol)
 * @example formatPriceNumber(12345.67) → "12,345.67"
 */
export const formatPriceNumber = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format ISO date to readable format
 * @example formatDate("2024-03-15T10:30:00Z") → "15 Mar 2024"
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Format ISO date to readable date and time
 * @example formatDateTime("2024-03-15T10:30:00Z") → "15 Mar 2024, 10:30 AM"
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
};

/**
 * Get relative time (e.g., "2 hours ago")
 */
export const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return formatDate(dateString);
};

// ============================================================================
// DATA UTILS
// ============================================================================

/**
 * Slugify a string
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')     // Remove all non-word chars
    .replace(/--+/g, '-');      // Replace multiple - with single -
};

/**
 * Capitalize first letter of each word
 */
export const capitalize = (text: string): string => {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

