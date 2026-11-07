import { siteConfig } from "@/config/site";
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";
import Stripe from "stripe";
import { urlFor } from "@/sanity/lib/image";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/orderStatus";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    // Check authentication
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    // Fetch the order from Sanity
    const order = await client.fetch(
      `*[_type == "order" && _id == $orderId && clerkUserId == $userId][0]{
        _id,
        orderNumber,
        customerName,
        email,
        clerkUserId,
        status,
        paymentStatus,
        paymentMethod,
        totalPrice,
        currency,
        products[]{
          _key,
          quantity,
          product->{
            _id,
            name,
            price,
            currency,
            images
          }
        },
        address
      }`,
      { orderId, userId }
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order is already paid
    if (
      order.status === ORDER_STATUSES.PAID ||
      order.paymentStatus === PAYMENT_STATUSES.PAID
    ) {
      return NextResponse.json(
        { error: "Order is already paid" },
        { status: 400 }
      );
    }

    // Check if order is eligible for payment (not cancelled)
    if (order.status === ORDER_STATUSES.CANCELLED) {
      return NextResponse.json(
        { error: "Cannot pay for cancelled order" },
        { status: 400 }
      );
    }

    // Convert order products to Stripe line items
    const lineItems = order.products.map(
      (item: {
        product?: {
          _id?: string;
          name?: string;
          price?: number;
          images?: string[];
        };
        quantity?: number;
      }) => {
        const itemPrice = item.product?.price || 0;
        const unitAmount = Math.round(itemPrice * 100); // Convert to cents

        // Convert Sanity image objects to URLs for Stripe
        let productImages: string[] = [];
        if (
          item.product?.images &&
          Array.isArray(item.product.images) &&
          item.product.images.length > 0
        ) {
          try {
            const imageUrl = urlFor(item.product.images[0])
              .width(800)
              .height(600)
              .url();
            if (imageUrl) {
              productImages = [imageUrl];
            }
          } catch (error) {
            console.warn("Failed to convert image URL:", error);
            productImages = [];
          }
        }

        return {
          quantity: item.quantity || 1,
          price_data: {
            currency: order.currency?.toLowerCase() || siteConfig.currency.code.toLowerCase(),
            unit_amount: unitAmount,
            product_data: {
              name: item.product?.name || "Product",
              description: `Product from order ${order.orderNumber}`,
              images: productImages,
              metadata: {
                productId: item.product?._id?.toString() || "",
                orderId: order._id,
                quantity: item.quantity?.toString() || "1",
              },
            },
          },
        };
      }
    );

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL}/orders?payment=cancelled`,
      metadata: {
        orderId: order._id,
        email: order.email,
        orderDate: new Date().toISOString(),
        itemCount: order.products.length.toString(),
        shippingAddress: JSON.stringify(order.address),
        orderAmount: order.totalPrice?.toString() || "",
      },
      customer_email: order.email,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      message: "Payment session created successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Payment session creation error:", error);
    return NextResponse.json(
      {
        error: errorMessage || "Failed to create payment session",
        details: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}
