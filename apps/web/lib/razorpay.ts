/**
 * Razorpay Payment Gateway Integration
 * Handles order creation and payment verification
 */

import Razorpay from 'razorpay';
import { getLogger } from '@/lib/logger';

const logger = getLogger('razorpay');

if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Razorpay credentials not configured');
}

/**
 * Initialize Razorpay instance
 */
const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

logger.info('Razorpay initialized');

export default razorpay;
