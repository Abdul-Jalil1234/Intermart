import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { writeClient } from "@/sanity/lib/client";
import { PAYMENT_STATUSES } from "@/lib/orderStatus";

export const POST = async (request: NextRequest) => {
  try {
    // This "Clerk payment" flow has no real payment processor behind it, so only an
    // administrator (e.g. confirming a manual/bank payment) may mark an order as paid.
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) return adminCheck.response;

    const reqBody = await request.json();
    const { orderId, sessionId, status } = reqBody;

    if (!orderId || !sessionId) {
      return NextResponse.json(
        { error: "Order ID and Session ID are required" },
        { status: 400 }
      );
    }

    // Update the order with payment status
    const updatedOrder = await writeClient
      .patch(orderId)
      .set({
        clerkPaymentId: sessionId,
        clerkPaymentStatus: status || "completed",
        paymentStatus:
          status === "completed"
            ? PAYMENT_STATUSES.PAID
            : PAYMENT_STATUSES.PENDING,
        stripePaymentIntentId: sessionId, // Store for reference
      })
      .commit();

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Payment status updated successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Clerk payment completion error:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to update payment status" },
      { status: 500 }
    );
  }
};
