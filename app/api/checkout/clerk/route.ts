import { siteConfig } from "@/config/site";
import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";

export const POST = async (request: NextRequest) => {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await request.json();
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Amounts come from the stored order, never from the browser.
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId && clerkUserId == $clerkUserId][0]{ orderNumber, totalPrice, email, address, "itemCount": count(products) }`,
      { orderId, clerkUserId }
    );
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const orderNumber: string = order.orderNumber;
    const orderAmount: number = order.totalPrice;
    const email: string = order.email;
    const shippingAddress = order.address;
    const items = { length: order.itemCount as number };

    // Verify user exists in Clerk
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(clerkUserId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create a payment session ID for tracking
    const clerkPaymentId = `clerk_payment_${Date.now()}_${orderId}`;

    // For now, we'll simulate a payment session
    // In a real implementation, you would integrate with Clerk's payment processing
    // or a payment gateway that works with Clerk's user management

    const paymentSession = {
      id: clerkPaymentId,
      orderId,
      orderNumber,
      userId: clerkUserId,
      email: user.emailAddresses[0]?.emailAddress || email,
      amount: orderAmount,
      currency: siteConfig.currency.code.toLowerCase(),
      status: "pending",
      metadata: {
        orderId: orderId.toString(),
        orderNumber: orderNumber.toString(),
        email,
        orderDate: new Date().toISOString(),
        itemCount: items.length.toString(),
        shippingAddress: JSON.stringify(shippingAddress),
        orderAmount: orderAmount?.toString() || "",
      },
      createdAt: new Date().toISOString(),
    };

    // In production, you would:
    // 1. Create a payment intent with your payment processor
    // 2. Associate it with the Clerk user
    // 3. Return a checkout URL or payment confirmation

    // Return payment page URL where user can complete payment
    const paymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/clerk-payment?session_id=${clerkPaymentId}&order_id=${orderId}&orderNumber=${orderNumber}&amount=${orderAmount}`;

    return NextResponse.json({
      success: true,
      paymentId: clerkPaymentId,
      url: paymentUrl,
      session: paymentSession,
      message: "Clerk payment session created successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Clerk checkout error:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to create Clerk checkout session" },
      { status: 500 }
    );
  }
};
