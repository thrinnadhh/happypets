/**
 * Email Service with Resend
 * Sends transactional emails for orders, approvals, suspensions, etc.
 */

import { Resend } from 'resend';
import type { Order, OrderWithItems, Profile, Product, OrderStatus } from '@happypets/shared';
import { getLogger } from '@/lib/logger';

const logger = getLogger('email');

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY not configured');
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@thehappypets.in';

// ============================================================================
// ORDER EMAILS
// ============================================================================

/**
 * Send order confirmation email
 */
export const sendOrderConfirmation = async (
  order: OrderWithItems,
  customer: Profile
): Promise<boolean> => {
  try {
    const orderNumber = order.id.slice(0, 8).toUpperCase();
    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            ${item.product_snapshot?.name || 'Product'}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
            ₹${item.price_at_purchase.toLocaleString('en-IN')}
          </td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .order-number { font-size: 24px; font-weight: bold; color: #0066cc; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .total-row { font-weight: bold; font-size: 18px; }
            .footer { color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 28px; margin-bottom: 10px;">🐾 Order Confirmed!</div>
              <div class="order-number">Order #${orderNumber}</div>
            </div>

            <p>Hi ${customer.full_name},</p>
            <p>Your order has been confirmed and will be processed shortly. Here's a summary of your purchase:</p>

            <table>
              <thead style="background: #f0f0f0;">
                <tr>
                  <th style="padding: 12px; text-align: left;">Product</th>
                  <th style="padding: 12px; text-align: center;">Quantity</th>
                  <th style="padding: 12px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
              <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span>Subtotal:</span>
                <span>₹${order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span>Shipping:</span>
                <span>₹${order.shipping_cost.toLocaleString('en-IN')}</span>
              </div>
              ${
                order.discount_amount > 0
                  ? `
                <div style="display: flex; justify-content: space-between; margin: 5px 0; color: #28a745;">
                  <span>Discount:</span>
                  <span>-₹${order.discount_amount.toLocaleString('en-IN')}</span>
                </div>
              `
                  : ''
              }
              <div class="total-row" style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                <span>Total:</span>
                <span style="color: #0066cc;">₹${order.total_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <h3 style="margin-top: 30px;">📍 Delivery Address</h3>
            <p>
              ${order.shipping_address.full_name}<br>
              ${order.shipping_address.street}<br>
              ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.zip_code}<br>
              Phone: ${order.shipping_address.phone}
            </p>

            <p style="margin-top: 20px;">
              ⏰ <strong>Estimated Delivery:</strong> 3-5 business days
            </p>

            <a href="https://thehappypets.in/orders/${order.id}" class="button" style="margin-top: 20px;">
              Track Your Order
            </a>

            <div class="footer">
              <p>Thank you for shopping at Happypets! 🐾</p>
              <p>If you have any questions, reply to this email or contact support@thehappypets.in</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: customer.email || '',
      subject: `🐾 Order Confirmed! #${orderNumber}`,
      html,
    });

    if (response.error) {
      logger.error('Failed to send order confirmation:', response.error);
      return false;
    }

    logger.info(`Order confirmation sent to ${customer.email}`);
    return true;
  } catch (error) {
    logger.error('Error sending order confirmation:', error);
    return false;
  }
};

/**
 * Send order status update email
 */
export const sendStatusUpdate = async (
  order: Order,
  customer: Profile,
  newStatus: OrderStatus
): Promise<boolean> => {
  try {
    const statusMessages: Record<OrderStatus, { subject: string; message: string }> = {
      pending: {
        subject: '⏳ Order Pending',
        message: 'Your order is pending payment confirmation.',
      },
      confirmed: {
        subject: '✅ Order Confirmed',
        message: 'Your order has been confirmed and is being processed.',
      },
      processing: {
        subject: '🔄 Order Processing',
        message: 'Your order is being prepared for shipment.',
      },
      shipped: {
        subject: '📦 Order Shipped',
        message: 'Great news! Your order has been shipped and is on the way to you.',
      },
      delivered: {
        subject: '✅ Order Delivered',
        message: 'Your order has been delivered. We hope you enjoy it! 🎉',
      },
      cancelled: {
        subject: '❌ Order Cancelled',
        message: 'Your order has been cancelled.',
      },
      refunded: {
        subject: '💰 Refund Processed',
        message: 'Your refund has been processed and will reflect in your account within 3-5 business days.',
      },
    };

    const { subject, message } = statusMessages[newStatus];

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .footer { color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 24px; margin-bottom: 10px;">${subject}</div>
              <div style="color: #666; font-size: 14px;">Order #${order.id.slice(0, 8).toUpperCase()}</div>
            </div>

            <p>Hi ${customer.full_name},</p>
            <p>${message}</p>

            <p style="margin-top: 20px;">
              <a href="https://thehappypets.in/orders/${order.id}" style="color: #0066cc; text-decoration: none;">
                View Order Details →
              </a>
            </p>

            <div class="footer">
              <p>Thank you for shopping at Happypets! 🐾</p>
              <p>Questions? Contact support@thehappypets.in</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: customer.email || '',
      subject,
      html,
    });

    if (response.error) {
      logger.error('Failed to send status update:', response.error);
      return false;
    }

    logger.info(`Status update (${newStatus}) sent to ${customer.email}`);
    return true;
  } catch (error) {
    logger.error('Error sending status update:', error);
    return false;
  }
};

// ============================================================================
// ADMIN EMAILS
// ============================================================================

/**
 * Send admin approval/rejection notification
 */
export const sendAdminApprovalNotification = async (
  admin: Profile,
  approved: boolean,
  shopName?: string
): Promise<boolean> => {
  try {
    const subject = approved
      ? '✅ Your Happypets Admin Account is Approved!'
      : '❌ Happypets Admin Application Update';

    const approvalMessage = approved
      ? `
        <p>Great news! Your admin account for <strong>${shopName || 'Your Shop'}</strong> has been approved. 🎉</p>
        <p>You can now:</p>
        <ul>
          <li>Add and manage products</li>
          <li>Track inventory and orders</li>
          <li>View sales analytics</li>
          <li>Manage your shop settings</li>
        </ul>
        <a href="https://thehappypets.in/admin/dashboard" style="display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px;">
          Go to Admin Dashboard
        </a>
      `
      : `
        <p>Thank you for your interest in becoming a Happypets admin partner. We've reviewed your application.</p>
        <p>Unfortunately, your application was not approved at this time. Please reach out to our support team for more information.</p>
      `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .footer { color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 24px; margin-bottom: 10px;">${subject}</div>
            </div>

            <p>Hi ${admin.full_name},</p>
            ${approvalMessage}

            <div class="footer">
              <p>Questions? Contact support@thehappypets.in</p>
              <p>Happypets Team 🐾</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: admin.email || '',
      subject,
      html,
    });

    if (response.error) {
      logger.error('Failed to send approval notification:', response.error);
      return false;
    }

    logger.info(`Approval notification sent to ${admin.email}`);
    return true;
  } catch (error) {
    logger.error('Error sending approval notification:', error);
    return false;
  }
};

/**
 * Send admin suspension notification
 */
export const sendAdminSuspensionNotification = async (
  admin: Profile,
  reason: string
): Promise<boolean> => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff6b6b; }
            .reason-box { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 24px; margin-bottom: 10px;">⚠️ Account Suspension Notice</div>
            </div>

            <p>Hi ${admin.full_name},</p>
            <p>Your Happypets admin account has been suspended effective immediately.</p>

            <div class="reason-box">
              <strong>Reason:</strong>
              <p>${reason}</p>
            </div>

            <p style="margin: 20px 0;">
              During the suspension period:
              <ul>
                <li>Your products will be hidden from the platform</li>
                <li>You cannot add or modify products</li>
                <li>You cannot process orders</li>
                <li>Existing orders will continue to be fulfilled</li>
              </ul>
            </p>

            <p style="margin-top: 30px;">
              If you believe this is a mistake or have questions, please contact our support team at
              <strong>support@thehappypets.in</strong>
            </p>

            <div class="footer">
              <p>Happypets Team 🐾</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: admin.email || '',
      subject: '⚠️ Your Happypets Admin Account Has Been Suspended',
      html,
    });

    if (response.error) {
      logger.error('Failed to send suspension notification:', response.error);
      return false;
    }

    logger.info(`Suspension notification sent to ${admin.email}`);
    return true;
  } catch (error) {
    logger.error('Error sending suspension notification:', error);
    return false;
  }
};

// ============================================================================
// INVENTORY EMAILS
// ============================================================================

/**
 * Send low stock alert to admin
 */
export const sendLowStockAlert = async (
  admin: Profile,
  product: Product
): Promise<boolean> => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .product-box { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            .button { display: inline-block; padding: 10px 20px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 24px; margin-bottom: 10px;">⚠️ Low Stock Alert</div>
            </div>

            <p>Hi ${admin.full_name},</p>
            <p>One of your products is running low on stock:</p>

            <div class="product-box">
              <strong>${product.name}</strong><br>
              <span style="color: #666; font-size: 14px;">SKU: ${product.sku}</span><br>
              <div style="margin-top: 10px; font-size: 18px; color: #ff6b6b;">
                <strong>Current Stock: ${product.stock_quantity} units</strong>
              </div>
            </div>

            <p>Consider restocking this product to meet customer demand.</p>

            <a href="https://thehappypets.in/admin/inventory" class="button">
              Update Inventory
            </a>

            <div class="footer">
              <p>Happypets Team 🐾</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: admin.email || '',
      subject: `⚠️ Low Stock Alert: ${product.name}`,
      html,
    });

    if (response.error) {
      logger.error('Failed to send low stock alert:', response.error);
      return false;
    }

    logger.info(`Low stock alert sent to ${admin.email} for ${product.id}`);
    return true;
  } catch (error) {
    logger.error('Error sending low stock alert:', error);
    return false;
  }
};

export default resend;
