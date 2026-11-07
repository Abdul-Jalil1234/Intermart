import { siteConfig } from "@/config/site";
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getMyOrders } from "@/sanity/helpers";
import { writeClient } from "@/sanity/lib/client";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
} from "@/lib/orderStatus";
import crypto from "crypto";
import { redemptionId, verifyPrizeToken } from "@/lib/wheel";
import { sendOrderStatusNotification } from "@/lib/notificationService";
import { sendOrderConfirmationEmail } from "@/lib/emailService";
import { after } from "next/server";
import { priceCart, PricingError } from "@/lib/pricing";

interface CartItem {
  product: {
    _id: string;
    name?: string;
    price?: number;
    category?: string;
    isPrize?: boolean;
    prizeToken?: string;
  };
  quantity: number;
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await getMyOrders(userId);

    return NextResponse.json(orders || []);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = async (request: NextRequest) => {
  try {
    // Check authentication
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reqBody = await request.json();
    const {
      items,
      shippingAddress,
      paymentMethod,
    } = reqBody;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Spin & Win prize: at most one, quantity 1, with a genuine unexpired token
    // that has not been redeemed before.
    const prizeItems = (items as CartItem[]).filter((i) => i?.product?.isPrize);
    if (prizeItems.length > 0) {
      const prize = prizeItems[0];
      const payload =
        prizeItems.length === 1 && prize.quantity === 1
          ? verifyPrizeToken(prize.product.prizeToken, prize.product._id)
          : null;
      if (!payload) {
        return NextResponse.json(
          { error: "Your Spin & Win prize is invalid or has expired" },
          { status: 400 }
        );
      }
      try {
        // Fails if this prize token was already used on another order.
        await writeClient.create({
          _id: redemptionId(payload.nonce),
          _type: "wheelRedemption",
          clerkUserId: userId,
          productId: prize.product._id,
          redeemedAt: new Date().toISOString(),
        });
      } catch {
        return NextResponse.json(
          { error: "This Spin & Win prize has already been used" },
          { status: 409 }
        );
      }
    }

    if (!shippingAddress) {
      return NextResponse.json(
        { error: "Shipping address is required" },
        { status: 400 }
      );
    }

    if (
      !paymentMethod ||
      ![PAYMENT_METHODS.CASH_ON_DELIVERY, PAYMENT_METHODS.STRIPE].includes(
        paymentMethod
      )
    ) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    // Recompute every amount on the server from the real product prices.
    let priced;
    try {
      priced = await priceCart(
        (items as CartItem[]).map((i) => ({
          productId: i?.product?._id,
          quantity: i?.quantity,
          isPrize: Boolean(i?.product?.isPrize),
        }))
      );
    } catch (e) {
      if (e instanceof PricingError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
    const { subtotal, shipping, tax, total: totalAmount } = priced;
    const unitPriceOf = (id: string) =>
      priced.lines.find((l) => l.productId === id)?.unitPrice ?? 0;

    // Generate order number
    const orderNumber = `ORDER-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    const userEmail = user.emailAddresses[0]?.emailAddress;
    const userName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
    const userPhone =
      user.phoneNumbers?.[0]?.phoneNumber || shippingAddress.phone || "";

    // Create order object
    const orderData = {
      _type: "order" as const,
      orderNumber,
      customerName: userName,
      email: userEmail,
      phone: userPhone,
      clerkUserId: userId,
      products: priced.lines.map((line) => ({
        _key: crypto.randomUUID(),
        product: { _type: "reference", _ref: line.productId },
        quantity: line.quantity,
      })),
      prizeProductId: priced.lines.find((l) => l.isPrize)?.productId,
      totalPrice: totalAmount,
      currency: siteConfig.currency.code,
      amountDiscount: 0, // Can be calculated if you have discount logic
      address: {
        _type: "object",
        name: shippingAddress.name,
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip: shippingAddress.zip,
      },
      status: ORDER_STATUSES.PENDING,
      orderDate: new Date().toISOString(),
      paymentMethod,
      paymentStatus:
        paymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY
          ? PAYMENT_STATUSES.PENDING
          : PAYMENT_STATUSES.PENDING,
      subtotal,
      shipping,
      tax,
      // Add payment-specific fields based on payment method
      ...(paymentMethod === PAYMENT_METHODS.STRIPE && {
        stripeCustomerId: "", // Will be populated when needed for invoicing
        stripePaymentIntentId: "", // Will be populated for Stripe payments
        stripeCheckoutSessionId: "", // Will be populated for Stripe payments
      }),
      ...(paymentMethod === PAYMENT_METHODS.CLERK && {
        clerkPaymentId: "", // Will be populated for Clerk payments
        clerkPaymentStatus: "pending", // Initial status
      }),
      ...(paymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY && {
        stripePaymentIntentId: `cod_${orderNumber}`,
      }),
    };

    // Create order in Sanity using writeClient (has create permissions)
    const createdOrder = await writeClient.create(orderData);

    // Track order placed event
    try {
      await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/api/analytics/track`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: "order_placed",
            eventParams: {
              orderId: createdOrder._id,
              orderNumber: createdOrder.orderNumber,
              amount: totalAmount,
              status: createdOrder.status,
              userId: userId,
              paymentMethod: paymentMethod,
              itemCount: items.length,
              subtotal: subtotal,
              shipping: shipping,
              tax: tax,
              customerEmail: userEmail,
              products: items.map((item: CartItem) => ({
                productId: item.product._id,
                name: item.product.name || "Unknown Product",
                quantity: item.quantity,
                price: unitPriceOf(item.product._id),
              })),
            },
          }),
        }
      );

      // Also track purchase event for e-commerce analytics
      await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/api/analytics/track`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: "purchase",
            eventParams: {
              orderId: createdOrder._id,
              value: totalAmount,
              currency: siteConfig.currency.code,
              items: items.map((item: CartItem) => ({
                productId: item.product._id,
                name: item.product.name || "Unknown Product",
                category: item.product.category || "Uncategorized",
                quantity: item.quantity,
                price: unitPriceOf(item.product._id),
              })),
              userId: userId,
            },
          }),
        }
      );
    } catch (analyticsError) {
      console.error("Failed to track order placed event:", analyticsError);
    }

    // Send order confirmation notification to user
    try {
      await sendOrderStatusNotification({
        clerkUserId: userId,
        orderNumber: createdOrder.orderNumber,
        orderId: createdOrder._id,
        status: ORDER_STATUSES.PENDING,
        // The full confirmation email below replaces the short status email.
        sendEmail: false,
      });
    } catch (notificationError) {
      console.error(
        "Failed to send order confirmation notification:",
        notificationError
      );
      // Don't fail the order creation if notification fails
    }

    // Send the detailed order confirmation email straight away, after the response is sent.
    if (userEmail) {
      after(async () => {
        try {
          await sendOrderConfirmationEmail({
            customerName: userName,
            customerEmail: userEmail,
            orderId: createdOrder.orderNumber,
            orderDate: new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            items: (items as CartItem[]).map((item) => ({
              name: item.product.name || "Product",
              price: unitPriceOf(item.product._id),
              quantity: item.quantity,
            })),
            subtotal: Number(subtotal) || 0,
            shipping: Number(shipping) || 0,
            tax: Number(tax) || 0,
            total: Number(totalAmount) || 0,
            shippingAddress: {
              name: shippingAddress.name,
              street: shippingAddress.address,
              city: shippingAddress.city,
              state: shippingAddress.state,
              zipCode: shippingAddress.zip,
              country: shippingAddress.country || "",
            },
          });
        } catch (emailError) {
          console.error("Failed to send order confirmation email:", emailError);
        }
      });
    }

    return NextResponse.json({
      success: true,
      order: {
        _id: createdOrder._id,
        orderNumber: createdOrder.orderNumber,
        status: createdOrder.status,
        paymentMethod: createdOrder.paymentMethod,
        totalPrice: createdOrder.totalPrice,
        currency: createdOrder.currency,
      },
      message: "Order created successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Order creation error:", error);
    console.error("Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : null,
    });
    return NextResponse.json(
      {
        error: errorMessage || "Failed to create order",
        details: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
};
