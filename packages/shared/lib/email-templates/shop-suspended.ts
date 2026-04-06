// packages/shared/lib/email-templates/shop-suspended.ts

export function shopSuspendedTemplate(props: {
  adminName: string;
  shopName: string;
  reason: string;
  appealUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="background-color: #dc2626; padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🐾 TheHappyPets</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px;">
            <h2 style="color: #1f2937; margin: 0 0 8px;">Shop Suspension Notice</h2>
            <p style="color: #6b7280; margin: 0 0 16px;">
              Hi ${props.adminName}, your shop <strong>"${props.shopName}"</strong> has been
              suspended from TheHappyPets marketplace.
            </p>

            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 4px; font-weight: bold; color: #991b1b;">Reason:</p>
              <p style="margin: 0; color: #991b1b;">${props.reason}</p>
            </div>

            <p style="color: #6b7280; margin: 0 0 24px;">
              Your products have been temporarily hidden from the marketplace. Existing orders
              will still be fulfilled. If you believe this is an error, you can submit an appeal.
            </p>

            <a href="${props.appealUrl}"
               style="display: inline-block; background-color: #374151; color: #ffffff; text-decoration: none;
                      padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">
              Submit an Appeal
            </a>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0;">© 2026 TheHappyPets. This is an automated notification.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
