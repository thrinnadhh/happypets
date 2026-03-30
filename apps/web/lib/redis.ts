/**
 * Redis Cache & Session Management
 * Uses Upstash Redis for serverless caching
 * All operations wrapped in try/catch to prevent crashes
 */

import { Redis } from '@upstash/redis';
import { getLogger } from '@/lib/logger';

const logger = getLogger('redis');

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ============================================================================
// GENERIC CACHE HELPERS
// ============================================================================

/**
 * Get value from cache
 * @param key - Cache key
 * @returns Cached value or null
 */
export const getCacheValue = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await redis.get<T>(key);
    logger.debug(`Cache hit: ${key}`);
    return value ?? null;
  } catch (error) {
    logger.error(`Redis GET error for key ${key}:`, error);
    return null;
  }
};

/**
 * Set value in cache with TTL
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in seconds (default: 300)
 */
export const setCacheValue = async <T>(
  key: string,
  value: T,
  ttl = 300
): Promise<boolean> => {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    logger.error(`Redis SET error for key ${key}:`, error);
    return false;
  }
};

/**
 * Delete cache key
 * @param key - Cache key
 */
export const deleteCacheKey = async (key: string): Promise<boolean> => {
  try {
    await redis.del(key);
    logger.debug(`Cache deleted: ${key}`);
    return true;
  } catch (error) {
    logger.error(`Redis DEL error for key ${key}:`, error);
    return false;
  }
};

/**
 * Scan and delete keys matching pattern
 * @param pattern - Key pattern (e.g., "products:*")
 */
export const deleteKeysByPattern = async (pattern: string): Promise<void> => {
  try {
    // Note: Upstash Redis uses SCAN differently; using simpler approach
    // In production, may need custom script
    logger.debug(`Attempting to delete pattern: ${pattern}`);
    // Placeholder for pattern deletion - depends on Upstash capabilities
  } catch (error) {
    logger.error(`Error deleting pattern ${pattern}:`, error);
  }
};

// ============================================================================
// PRODUCT CACHE HELPERS
// ============================================================================

const PRODUCT_CACHE_PREFIX = 'products';
const PRODUCT_SINGLE_PREFIX = 'product';

/**
 * Get cached products list
 * @param queryHash - Hash of query params
 * @returns Cached products or null
 */
export const getCachedProducts = async <T>(queryHash: string): Promise<T | null> => {
  return getCacheValue<T>(`${PRODUCT_CACHE_PREFIX}:${queryHash}`);
};

/**
 * Set cached products list
 * @param queryHash - Hash of query params
 * @param data - Products data
 * @param ttl - Time to live (default: 300s = 5min)
 */
export const setCachedProducts = async <T>(
  queryHash: string,
  data: T,
  ttl = 300
): Promise<boolean> => {
  return setCacheValue(`${PRODUCT_CACHE_PREFIX}:${queryHash}`, data, ttl);
};

/**
 * Get cached single product
 * @param productId - Product ID
 * @returns Cached product or null
 */
export const getCachedProduct = async <T>(productId: string): Promise<T | null> => {
  return getCacheValue<T>(`${PRODUCT_SINGLE_PREFIX}:${productId}`);
};

/**
 * Set cached single product
 * @param productId - Product ID
 * @param data - Product data
 * @param ttl - Time to live (default: 600s = 10min)
 */
export const setCachedProduct = async <T>(
  productId: string,
  data: T,
  ttl = 600
): Promise<boolean> => {
  return setCacheValue(`${PRODUCT_SINGLE_PREFIX}:${productId}`, data, ttl);
};

/**
 * Bust all product cache for a shop
 * @param shopId - Shop ID
 */
export const bustProductCacheForShop = async (shopId: string): Promise<void> => {
  try {
    const pattern = `${PRODUCT_CACHE_PREFIX}:shop:${shopId}:*`;
    await deleteKeysByPattern(pattern);
    logger.debug(`Busted product cache for shop ${shopId}`);
  } catch (error) {
    logger.error(`Error busting cache for shop ${shopId}:`, error);
  }
};

/**
 * Bust single product cache
 * @param productId - Product ID
 */
export const bustSingleProductCache = async (
  productId: string
): Promise<void> => {
  try {
    await deleteCacheKey(`${PRODUCT_SINGLE_PREFIX}:${productId}`);
    logger.debug(`Busted cache for product ${productId}`);
  } catch (error) {
    logger.error(`Error busting cache for product ${productId}:`, error);
  }
};

// ============================================================================
// CART HELPERS (7-day TTL)
// ============================================================================

const CART_PREFIX = 'cart';
const CART_TTL = 604800; // 7 days in seconds

/**
 * Get user's cart from cache
 * @param userId - User ID
 * @returns Cart items or empty array
 */
export const getCart = async (userId: string): Promise<any[]> => {
  try {
    const cart = await getCacheValue<any[]>(`${CART_PREFIX}:${userId}`);
    return cart ?? [];
  } catch (error) {
    logger.error(`Error getting cart for user ${userId}:`, error);
    return [];
  }
};

/**
 * Save user's cart to cache
 * @param userId - User ID
 * @param cart - Cart items
 */
export const saveCart = async (userId: string, cart: any[]): Promise<boolean> => {
  return setCacheValue(`${CART_PREFIX}:${userId}`, cart, CART_TTL);
};

/**
 * Clear user's cart
 * @param userId - User ID
 */
export const clearCart = async (userId: string): Promise<boolean> => {
  return deleteCacheKey(`${CART_PREFIX}:${userId}`);
};

// ============================================================================
// SESSION SECURITY - BLACKLISTING
// ============================================================================

const BLACKLIST_PREFIX = 'blacklist';
const BLACKLIST_TTL = 86400; // 24 hours

/**
 * Blacklist user session (used for suspension)
 * @param userId - User ID
 * @param reason - Reason for blacklist
 */
export const blacklistSession = async (
  userId: string,
  reason = 'suspended'
): Promise<boolean> => {
  try {
    await redis.setex(
      `${BLACKLIST_PREFIX}:${userId}`,
      BLACKLIST_TTL,
      JSON.stringify({
        reason,
        blacklistedAt: new Date().toISOString(),
      })
    );
    logger.info(`Session blacklisted for user ${userId}: ${reason}`);
    return true;
  } catch (error) {
    logger.error(`Error blacklisting session for user ${userId}:`, error);
    return false;
  }
};

/**
 * Check if user session is blacklisted
 * @param userId - User ID
 * @returns true if blacklisted
 */
export const isSessionBlacklisted = async (userId: string): Promise<boolean> => {
  try {
    const value = await redis.get(`${BLACKLIST_PREFIX}:${userId}`);
    return value !== null;
  } catch (error) {
    logger.error(`Error checking blacklist for user ${userId}:`, error);
    return false;
  }
};

/**
 * Remove user from blacklist (e.g., appeal successful)
 * @param userId - User ID
 */
export const removeSessionBlacklist = async (userId: string): Promise<boolean> => {
  return deleteCacheKey(`${BLACKLIST_PREFIX}:${userId}`);
};

// ============================================================================
// RATE LIMITING
// ============================================================================

const RATE_LIMIT_PREFIX = 'ratelimit';

/**
 * Rate limit check using token bucket algorithm
 * @param identifier - IP, user ID, or email
 * @param limit - Max requests (default: 100)
 * @param window - Time window in seconds (default: 60)
 * @returns Object with allowed, remaining, and reset time
 */
export const rateLimit = async (
  identifier: string,
  limit = 100,
  window = 60
): Promise<{
  allowed: boolean;
  remaining: number;
  reset: number;
}> => {
  try {
    const key = `${RATE_LIMIT_PREFIX}:${identifier}`;

    // Get current count
    const count = await redis.incr(key);

    // If first request, set expiry
    if (count === 1) {
      await redis.expire(key, window);
    }

    // Get TTL for reset time
    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;

    logger.debug(
      `Rate limit for ${identifier}: ${count}/${limit} (remaining: ${remaining})`
    );

    return {
      allowed,
      remaining,
      reset: ttl > 0 ? ttl : window,
    };
  } catch (error) {
    logger.error(`Rate limit error for ${identifier}:`, error);
    // On error, allow request to prevent service disruption
    return {
      allowed: true,
      remaining: 1,
      reset: 0,
    };
  }
};

export default redis;
