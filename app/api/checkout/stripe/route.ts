import { siteConfig } from "@/config/site";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { urlFor } from "@/sanity/lib/image";
import { backendClient } from "@/sanity/lib/backendClient";

type OrderForPayment = {
  _id: string;
  orderNumber: string;
  clerkUserId: string;
  email?: string;
  paymentStatus?: string;
  shipping?: number;
  tax?: number;
  prizeProductId?: string;
  address?: Record<string, string>;
  products: {
    quantity: number;
    product: { _id: string; name?: string; price?: number; description?: string; images?: unknown[] };
  }[];
};

/**
 * Creates a Stripe Checkout session for an EXISTING order.
 * All amounts come from Sanity (the order + live product prices), never from the browser.
 */
export const POST = async (request: NextRequest) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await request.json();
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const order: OrderForPayment | null = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]{
        _id, orderNumber, clerkUserId, email, paymentStatus, shipping, tax, prizeProductId, address,
        products[]{ quantity, product->{ _id, name, price, description, images } }
      }`,
      { orderId }
    );

    if (!order || order.clerkUserId !== userId) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.paymentStatus === "paid") {
      return NextResponse.json({ error: "Order is already paid" }, { status: 409 });
    }

    const currency = siteConfig.currency.code.toLowerCase();
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const line of order.products ?? []) {
      const p = line.product;
      if (!p) continue;
      const unit = p._id === order.prizeProductId ? 0 : Number(p.price) || 0;
      if (unit <= 0) continue; // free prize item – nothing to charge

      let images: string[] = [];
      try {
        if (p.images?.[0]) {
          images = [urlFor(p.images[0] as never).width(800).height(600).url()];
        }
      } catch {
        images = [];
      }
      lineItems.push({
        quantity: line.quantity,
        price_data: {
          currency,
          unit_amount: Math.round(unit * 100),
          product_data: {
            name: p.name || "Product",
            description: p.description?.slice(0, 300) || undefined,
            images,
            metadata: { productId: p._id, orderId: order._id },
          },
        },
      });
    }

    if (order.shipping && order.shipping > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(order.shipping * 100),
          product_data: { name: "Shipping" },
        },
      });
    }
    if (order.tax && order.tax > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(order.tax * 100),
          product_data: { name: "Tax" },
        },
      });
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: "Nothing to pay for" }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const base = process.env.NEXT_PUBLIC_BASE_URL;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}&orderNumber=${order.orderNumber}`,
      cancel_url: `${base}/user/orders/${order._id}?cancelled=true`,
      metadata: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        email: order.email ?? "",
        orderDate: new Date().toISOString(),
        itemCount: String(order.products?.length ?? 0),
        shippingAddress: JSON.stringify(order.address ?? {}),
      },
      customer_email: order.email,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      message: "Stripe checkout session created successfully",
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe checkout session" },
      { status: 500 }
    );
  }
};
