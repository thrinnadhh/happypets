// packages/shared/lib/email-templates/order-confirmed.ts

interface OrderConfirmedProps {
  customerName: string;
  orderNumber: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  estimatedDelivery: string;
  trackingUrl: string;
}

export function orderConfirmedTemplate(props: OrderConfirmedProps): string {
  const itemRows = props.items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
        ${item.name}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
        ₹${item.price.toFixed(2)}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #f97316, #fb923c); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🐾 TheHappyPets</h1>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 32px;">
            <h2 style="color: #1f2937; margin: 0 0 8px;">Order Confirmed! 🎉</h2>
            <p style="color: #6b7280; margin: 0 0 24px;">
              Hi ${props.customerName}, your order <strong>${props.orderNumber}</strong> has been confirmed
              and is being prepared.
            </p>

            <!-- Order Items -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 8px 0; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Item</th>
                  <th style="padding: 8px 0; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase;">Qty</th>
                  <th style="padding: 8px 0; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 16px 0; text-align: right; font-weight: bold; font-size: 16px;">
                    Total:
                  </td>
                  <td style="padding: 16px 0; text-align: right; font-weight: bold; font-size: 16px; color: #f97316;">
                    ₹${props.total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <!-- Delivery Estimate -->
            <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #9a3412; font-size: 14px;">
                📦 Estimated Delivery: <strong>${props.estimatedDelivery}</strong>
              </p>
            </div>

            <!-- CTA -->
            <a href="${props.trackingUrl}"
               style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none;
                      padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">
              Track Your Order →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0 0 8px;">Need help? Reply to this email or contact support@thehappypets.in</p>
            <p style="margin: 0;">© 2026 TheHappyPets. Made with ❤️ for pets and their humans.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
