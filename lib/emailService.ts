import nodemailer, { Transporter, SentMessageInfo } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { siteConfig } from "@/config/site";
import { contactConfig } from "@/config/contact";
import { formatCurrency as formatMoney } from "@/lib/currency";


const transporter: Transporter<SMTPTransport.SentMessageInfo> =
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: siteConfig.email.senderAddress,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    },
  });

// Type definitions
interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface OrderConfirmationData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  orderDate: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: ShippingAddress;
  estimatedDelivery?: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SendMailParams {
  email: string;
  subject: string;
  text: string;
  html?: string;
}

const generateOrderConfirmationHTML = (data: OrderConfirmationData): string => {
  const formatCurrency = (amount: number) => formatMoney(amount);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - ${data.orderId}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, ${siteConfig.colors.dark} 0%, ${siteConfig.colors.primary} 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 30px 20px;
        }
        
        .greeting {
            margin-bottom: 25px;
        }
        
        .greeting h2 {
            color: ${siteConfig.colors.dark};
            font-size: 22px;
            margin-bottom: 10px;
        }
        
        .order-summary {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border: 1px solid #dee2e6;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e9ecef;
        }
        
        .order-id {
            font-weight: 700;
            color: ${siteConfig.colors.dark};
            font-size: 18px;
        }
        
        .order-date {
            color: #6c757d;
            font-size: 14px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .items-table th {
            background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
            color: #495057;
            font-weight: 700;
            padding: 15px 12px;
            text-align: left;
            border-bottom: 2px solid #dee2e6;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .items-table td {
            padding: 18px 12px;
            border-bottom: 1px solid #e9ecef;
            background: white;
        }
        
        .items-table tr:hover td {
            background: #f8f9fa;
        }
        
        .item-image {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid #dee2e6;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .item-name {
            font-weight: 600;
            color: #495057;
            margin-bottom: 5px;
        }
        
        .quantity {
            background-color: ${siteConfig.colors.primary};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .price {
            font-weight: 700;
            color: ${siteConfig.colors.dark};
        }
        
        .totals {
            margin-top: 25px;
            padding: 25px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            border: 1px solid #dee2e6;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding: 8px 0;
            font-size: 16px;
            line-height: 1.5;
        }
        
        .total-row span:first-child {
            font-weight: 600;
            color: #495057;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .total-row span:last-child {
            font-weight: 700;
            color: ${siteConfig.colors.dark};
            font-size: 18px;
        }
        
        .total-row.final {
            background: linear-gradient(135deg, ${siteConfig.colors.dark} 0%, ${siteConfig.colors.primary} 100%);
            color: white;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            border: none;
            box-shadow: 0 4px 8px rgba(6, 60, 40, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .total-row.final span:first-child {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .total-row.final span:last-child {
            color: white;
            font-size: 24px;
            font-weight: 800;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .shipping-info {
            background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border: 1px solid #c3e6cb;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .shipping-info h3 {
            color: ${siteConfig.colors.dark};
            margin-bottom: 15px;
            font-size: 18px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .address {
            color: #495057;
            line-height: 1.8;
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .address strong {
            color: ${siteConfig.colors.dark};
            font-size: 16px;
        }
        
        .delivery-info {
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border: 1px solid #ffeeba;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .delivery-info h3 {
            color: #856404;
            margin-bottom: 15px;
            font-size: 18px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .delivery-info p {
            color: #664d03;
            font-weight: 600;
            background: white;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 0;
            border: 1px solid #f5c842;
        }
        
        .next-steps {
            background: linear-gradient(135deg, #d1ecf1 0%, #b8e6ff 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border: 1px solid #bee5eb;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .next-steps h3 {
            color: #0c5460;
            margin-bottom: 15px;
            font-size: 18px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .next-steps ul {
            list-style: none;
            padding-left: 0;
        }
        
        .next-steps li {
            padding: 8px 0;
            padding-left: 25px;
            position: relative;
            color: #0c5460;
        }
        
        .next-steps li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #17a2b8;
            font-weight: bold;
        }
        
        .support-section {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }
        
        .support-section h3 {
            color: ${siteConfig.colors.dark};
            margin-bottom: 15px;
        }
        
        .contact-info {
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 15px;
        }
        
        .contact-item {
            text-align: center;
        }
        
        .contact-item strong {
            color: ${siteConfig.colors.dark};
            display: block;
            margin-bottom: 5px;
        }
        
        .footer {
            background: linear-gradient(135deg, #343a40 0%, #495057 100%);
            color: #ffffff;
            padding: 40px 20px;
            text-align: center;
            border-top: 4px solid ${siteConfig.colors.dark};
        }
        
        .footer p {
            margin-bottom: 15px;
            opacity: 0.9;
            font-size: 14px;
        }
        
        .social-links {
            margin-top: 20px;
        }
        
        .social-links a {
            color: #ffffff;
            text-decoration: none;
            margin: 0 10px;
            opacity: 0.8;
            transition: opacity 0.3s;
        }
        
        .social-links a:hover {
            opacity: 1;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
            }
            
            .header, .content, .footer {
                padding: 20px 15px;
            }
            
            .items-table {
                font-size: 14px;
            }
            
            .items-table th,
            .items-table td {
                padding: 8px 4px;
            }
            
            .order-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            
            .contact-info {
                flex-direction: column;
                gap: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Thank you for shopping with ${siteConfig.displayName}</p>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <!-- Greeting -->
            <div class="greeting">
                <h2>Hi ${data.customerName}!</h2>
                <p>We're excited to let you know that your order has been confirmed and is being prepared for shipment. You'll receive another email when your order is on its way.</p>
            </div>
            
            <!-- Order Summary -->
            <div class="order-summary">
                <div class="order-header">
                    <span class="order-id">Order #${data.orderId}</span>
                    <span class="order-date">Placed on ${data.orderDate}</span>
                </div>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 60px;">Item</th>
                            <th>Product</th>
                            <th style="width: 80px; text-align: center;">Qty</th>
                            <th style="width: 100px; text-align: right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items
                          .map(
                            (item) => `
                            <tr>
                                <td>
                                    ${
                                      item.image
                                        ? `<img src="${item.image}" alt="${item.name}" class="item-image" />`
                                        : `<div class="item-image" style="background-color: #e9ecef; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #6c757d;">No Image</div>`
                                    }
                                </td>
                                <td>
                                    <div class="item-name">${item.name}</div>
                                </td>
                                <td style="text-align: center;">
                                    <span class="quantity">${
                                      item.quantity
                                    }</span>
                                </td>
                                <td style="text-align: right;">
                                    <span class="price">${formatCurrency(
                                      item.price * item.quantity
                                    )}</span>
                                </td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(data.subtotal)}</span>
                    </div>
                    <div class="total-row">
                        <span>Shipping:</span>
                        <span>${formatCurrency(data.shipping)}</span>
                    </div>
                    <div class="total-row">
                        <span>Tax:</span>
                        <span>${formatCurrency(data.tax)}</span>
                    </div>
                    <div class="total-row final">
                        <span>Total:</span>
                        <span>${formatCurrency(data.total)}</span>
                    </div>
                </div>
            </div>
            
            <!-- Shipping Information -->
            <div class="shipping-info">
                <h3>📦 Shipping Address</h3>
                <div class="address">
                    <strong>${data.shippingAddress.name}</strong><br>
                    ${data.shippingAddress.street}<br>
                    ${data.shippingAddress.city}, ${
    data.shippingAddress.state
  } ${data.shippingAddress.zipCode}<br>
                    ${data.shippingAddress.country}
                </div>
            </div>
            
            ${
              data.estimatedDelivery
                ? `
            <!-- Delivery Information -->
            <div class="delivery-info">
                <h3>🚚 Estimated Delivery</h3>
                <p>${data.estimatedDelivery}</p>
            </div>
            `
                : ""
            }
            
            <!-- Next Steps -->
            <div class="next-steps">
                <h3>What happens next?</h3>
                <ul>
                    <li>We'll prepare your order for shipment</li>
                    <li>You'll receive a tracking number via email once shipped</li>
                    <li>Track your package progress in real-time</li>
                    <li>Your order will be delivered to the address provided</li>
                </ul>
            </div>
            
            <!-- Support Section -->
            <div class="support-section">
                <h3>Need Help?</h3>
                <p>Our customer service team is here to help with any questions about your order.</p>
                
                <div class="contact-info">
                    <div class="contact-item">
                        <strong>Email</strong>
                        <span>${contactConfig.emails.support}</span>
                    </div>
                    <div class="contact-item">
                        <strong>Phone</strong>
                        <span>${contactConfig.company.phone}</span>
                    </div>
                    <div class="contact-item">
                        <strong>Hours</strong>
                        <span>Mon-Fri: 9AM-6PM</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p><strong>${siteConfig.displayName}</strong></p>
            <p>123 Shopping Street, Commerce District<br>
               New York, NY 10001, USA</p>
            <p>Thank you for choosing ${siteConfig.displayName}!</p>
            
            <div class="social-links">
                <a href="https://www.youtube.com/@reactjsBD">Facebook</a> |
                <a href="https://www.youtube.com/@reactjsBD">Twitter</a> |
                <a href="https://www.youtube.com/@reactjsBD">Instagram</a> |
                <a href="https://www.youtube.com/@reactjsBD">Support</a>
            </div>
        </div>
    </div>
</body>
</html>`;
};

const sendOrderConfirmationEmail = async (
  data: OrderConfirmationData
): Promise<EmailResponse> => {
  try {
    const htmlContent = generateOrderConfirmationHTML(data);

    const mailOptions = {
      from: `"${siteConfig.email.senderName}" <${siteConfig.email.senderAddress}>`,
      to: data.customerEmail,
      subject: `Order Confirmation - ${data.orderId} | Thank you for your purchase!`,
      html: htmlContent,
      // Fallback text version
      text: `
Hi ${data.customerName}!

Thank you for your order! Here are the details:

Order ID: ${data.orderId}
Order Date: ${data.orderDate}
Total: ${formatMoney(data.total)}

Items Ordered:
${data.items
  .map(
    (item) =>
      `- ${item.name} (Qty: ${item.quantity}) - ${formatMoney(
        item.price * item.quantity
      )}`
  )
  .join("\n")}

Shipping Address:
${data.shippingAddress.name}
${data.shippingAddress.street}
${data.shippingAddress.city}, ${data.shippingAddress.state} ${
        data.shippingAddress.zipCode
      }
${data.shippingAddress.country}

${data.estimatedDelivery ? `Estimated Delivery: ${data.estimatedDelivery}` : ""}

We'll send you another email with tracking information once your order ships.

If you have any questions, please contact us at ${contactConfig.emails.support} or ${contactConfig.company.phone}.

Thank you for choosing ${siteConfig.displayName}!
      `,
    };

    const result = await transporter.sendMail(mailOptions);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Simple email function for other purposes
const sendMail = async ({
  email,
  subject,
  text,
  html,
}: SendMailParams): Promise<EmailResponse> => {
  try {
    const mailOptions = {
      from: `"${siteConfig.email.senderName}" <${siteConfig.email.senderAddress}>`,
      to: email,
      subject,
      text,
      ...(html && { html }),
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};


interface NotificationEmailParams {
  to: string;
  name?: string;
  title: string;
  message: string;
  /** Absolute URL for the call-to-action button. */
  actionUrl?: string;
  actionLabel?: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Short, branded transactional email (order status updates and other notices).
 * Used so the customer gets an email at the same moment the in-app notification is created.
 */
const sendNotificationEmail = async ({
  to,
  name,
  title,
  message,
  actionUrl,
  actionLabel = "View details",
}: NotificationEmailParams): Promise<EmailResponse> => {
  const { colors, displayName } = siteConfig;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:${colors.dark};padding:20px 24px;border-bottom:4px solid ${colors.primary};">
      <h1 style="margin:0;font-size:20px;color:#ffffff;">${escapeHtml(displayName)}</h1>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 12px;">Hi ${escapeHtml(name || "there")},</p>
      <h2 style="margin:0 0 12px;font-size:18px;color:${colors.dark};">${escapeHtml(title)}</h2>
      <p style="margin:0 0 20px;line-height:1.6;">${escapeHtml(message)}</p>
      ${
        actionUrl
          ? `<a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:${colors.primary};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;">${escapeHtml(actionLabel)}</a>`
          : ""
      }
    </div>
    <div style="padding:16px 24px;background:#fafafa;font-size:12px;color:#6b7280;">
      Questions? Contact us at ${escapeHtml(contactConfig.emails.support)} or ${escapeHtml(contactConfig.company.phone)}.
    </div>
  </div>
</body>
</html>`;

  return sendMail({
    email: to,
    subject: `${title} | ${displayName}`,
    text: `Hi ${name || "there"},\n\n${title}\n${message}${actionUrl ? `\n\n${actionLabel}: ${actionUrl}` : ""}\n\n${displayName}`,
    html,
  });
};

export { sendOrderConfirmationEmail, sendMail, sendNotificationEmail };
export type {
  OrderConfirmationData,
  OrderItem,
  ShippingAddress,
  EmailResponse,
  SendMailParams,
};
