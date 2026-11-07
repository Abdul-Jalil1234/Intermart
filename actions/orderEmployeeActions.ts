"use server";

import { auth } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { EmployeeRole } from "@/types/employee";
import { updateEmployeePerformance } from "./employeeActions";
import { sendOrderStatusNotification } from "@/lib/notificationService";
import { invalidateOrder } from "@/lib/cache";

// Add status history entry
async function addStatusHistory(
  orderId: string,
  status: string,
  employeeEmail: string,
  role: EmployeeRole | "admin" | "system",
  notes?: string
) {
  const order = await backendClient.fetch(
    `*[_type == "order" && _id == $orderId][0] { statusHistory }`,
    { orderId }
  );

  const statusHistory = order?.statusHistory || [];

  statusHistory.push({
    status,
    changedBy: employeeEmail,
    changedByRole: role,
    changedAt: new Date().toISOString(),
    notes,
  });

  await backendClient.patch(orderId).set({ statusHistory }).commit();
}

// Call Center: Confirm address
export async function confirmAddress(
  orderId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && employeeRole == "callcenter"][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only call center employees can confirm addresses",
      };
    }

    await backendClient
      .patch(orderId)
      .set({
        addressConfirmedBy: employee.email,
        addressConfirmedAt: new Date().toISOString(),
        status: "address_confirmed",
      })
      .commit();

    await addStatusHistory(
      orderId,
      "Address Confirmed",
      employee.email,
      "callcenter",
      notes
    );

    return { success: true, message: "Address confirmed successfully" };
  } catch (error) {
    console.error("Error confirming address:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to confirm address",
    };
  }
}

// Call Center: Update shipping address (before confirmation)
export async function updateShippingAddress(
  orderId: string,
  shippingAddress: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && employeeRole == "callcenter"][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only call center employees can update shipping address",
      };
    }

    // Check if address is already confirmed
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0] { addressConfirmedBy }`,
      { orderId }
    );

    if (order?.addressConfirmedBy) {
      return {
        success: false,
        message: "Cannot update address after it has been confirmed",
      };
    }

    await backendClient.patch(orderId).set({ shippingAddress }).commit();

    await addStatusHistory(
      orderId,
      "Shipping Address Updated",
      employee.email,
      "callcenter",
      "Address details were corrected/updated"
    );

    return { success: true, message: "Shipping address updated successfully" };
  } catch (error) {
    console.error("Error updating shipping address:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update shipping address",
    };
  }
}

// Call Center: Confirm order
export async function confirmOrder(
  orderId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && (employeeRole == "callcenter" || employeeRole == "incharge")][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only call center employees can confirm orders",
      };
    }

    // Get current order
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]`,
      { orderId }
    );

    if (!order.addressConfirmedBy) {
      return { success: false, message: "Please confirm the address first" };
    }

    await backendClient
      .patch(orderId)
      .set({
        orderConfirmedBy: employee.email,
        orderConfirmedAt: new Date().toISOString(),
        status: "order_confirmed",
      })
      .commit();

    await addStatusHistory(
      orderId,
      "Order Confirmed",
      employee.email,
      employee.employeeRole,
      notes
    );

    // Send notification to customer
    try {
      await sendOrderStatusNotification({
        clerkUserId: order.clerkUserId,
        orderNumber: order.orderNumber,
        orderId: order._id,
        status: "order_confirmed",
      });
    } catch (notificationError) {
      console.error(
        "Failed to send order confirmation notification:",
        notificationError
      );
    }

    // Update employee performance
    const currentPerformance = employee.employeePerformance || {};
    await updateEmployeePerformance(employee._id, {
      ordersProcessed: (currentPerformance.ordersProcessed || 0) + 1,
      ordersConfirmed: (currentPerformance.ordersConfirmed || 0) + 1,
    });

    return { success: true, message: "Order confirmed successfully" };
  } catch (error) {
    console.error("Error confirming order:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to confirm order",
    };
  }
}

// Packer: Mark order as packed
export async function markAsPacked(
  orderId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && (employeeRole == "packer" || employeeRole == "incharge")][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only packers can mark orders as packed",
      };
    }

    // Get current order
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]`,
      { orderId }
    );

    if (!order.orderConfirmedBy) {
      return {
        success: false,
        message: "Order must be confirmed before packing",
      };
    }

    await backendClient
      .patch(orderId)
      .set({
        packedBy: employee.email,
        packedAt: new Date().toISOString(),
        packingNotes: notes,
        status: "packed",
      })
      .commit();

    await addStatusHistory(
      orderId,
      "Packed",
      employee.email,
      employee.employeeRole,
      notes
    );

    // Send notification to customer
    try {
      await sendOrderStatusNotification({
        clerkUserId: order.clerkUserId,
        orderNumber: order.orderNumber,
        orderId: order._id,
        status: "packed",
      });
    } catch (notificationError) {
      console.error("Failed to send packed notification:", notificationError);
    }

    // Update employee performance
    const currentPerformance = employee.employeePerformance || {};
    await updateEmployeePerformance(employee._id, {
      ordersProcessed: (currentPerformance.ordersProcessed || 0) + 1,
      ordersPacked: (currentPerformance.ordersPacked || 0) + 1,
    });

    // Invalidate caches for instant updates
    await invalidateOrder(orderId, order.clerkUserId);

    return { success: true, message: "Order marked as packed successfully" };
  } catch (error) {
    console.error("Error marking order as packed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to mark as packed",
    };
  }
}

// Warehouse: Assign deliveryman to packed order
export async function assignDeliveryman(
  orderId: string,
  deliverymanId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && (employeeRole == "warehouse" || employeeRole == "incharge")][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only warehouse employees can assign deliverymen",
      };
    }

    // Get order to check if it's packed
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]`,
      { orderId }
    );

    if (!order.packedBy) {
      return {
        success: false,
        message: "Order must be packed before assigning to deliveryman",
      };
    }

    const deliveryman = await backendClient.fetch(
      `*[_type == "user" && _id == $deliverymanId && isEmployee == true && employeeRole == "deliveryman"][0]`,
      { deliverymanId }
    );

    if (!deliveryman) {
      return { success: false, message: "Deliveryman not found" };
    }

    await backendClient
      .patch(orderId)
      .set({
        assignedDeliverymanId: deliverymanId,
        assignedDeliverymanName: `${deliveryman.firstName} ${deliveryman.lastName}`,
        dispatchedBy: employee.email,
        dispatchedAt: new Date().toISOString(),
        status: "ready_for_delivery",
      })
      .commit();

    await addStatusHistory(
      orderId,
      "Assigned for Delivery",
      employee.email,
      employee.employeeRole,
      notes || `Assigned to ${deliveryman.firstName} ${deliveryman.lastName}`
    );

    // Update warehouse employee performance
    const currentPerformance = employee.employeePerformance || {};
    await updateEmployeePerformance(employee._id, {
      ordersProcessed: (currentPerformance.ordersProcessed || 0) + 1,
      ordersAssignedForDelivery:
        (currentPerformance.ordersAssignedForDelivery || 0) + 1,
    });

    return {
      success: true,
      message: `Order assigned to ${deliveryman.firstName} ${deliveryman.lastName}`,
    };
  } catch (error) {
    console.error("Error assigning deliveryman:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to assign deliveryman",
    };
  }
}

// Deliveryman: Mark as delivered (with cash collection check)
export async function markAsDelivered(
  orderId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && (employeeRole == "deliveryman" || employeeRole == "incharge")][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only deliverymen can mark orders as delivered",
      };
    }

    // Get current order
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]`,
      { orderId }
    );

    // Check if payment is required
    const isCOD = order.paymentMethod === "cash_on_delivery";
    const isPending = order.paymentStatus === "pending";

    if ((isCOD || isPending) && !order.cashCollected) {
      return {
        success: false,
        message:
          "Cash must be collected from customer before marking as delivered",
      };
    }

    const updateData: any = {
      deliveredBy: employee.email,
      deliveredAt: new Date().toISOString(),
      deliveryNotes: notes,
      status: "delivered",
    };

    await backendClient.patch(orderId).set(updateData).commit();

    await addStatusHistory(
      orderId,
      "Delivered",
      employee.email,
      employee.employeeRole,
      notes
    );

    // Send notification to customer
    try {
      await sendOrderStatusNotification({
        clerkUserId: order.clerkUserId,
        orderNumber: order.orderNumber,
        orderId: order._id,
        status: "delivered",
      });
    } catch (notificationError) {
      console.error(
        "Failed to send delivered notification:",
        notificationError
      );
    }

    // Update employee performance
    const currentPerformance = employee.employeePerformance || {};
    await updateEmployeePerformance(employee._id, {
      ordersProcessed: (currentPerformance.ordersProcessed || 0) + 1,
      ordersDelivered: (currentPerformance.ordersDelivered || 0) + 1,
    });

    // Invalidate caches for instant updates
    await invalidateOrder(orderId, order.clerkUserId);

    return {
      success: true,
      message: "Order delivered successfully",
    };
  } catch (error) {
    console.error("Error marking order as delivered:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to mark as delivered",
    };
  }
}

// Deliveryman: Collect cash from customer (separate from delivery)
export async function collectCash(
  orderId: string,
  cashAmount: number
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && (employeeRole == "deliveryman" || employeeRole == "incharge")][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only deliverymen can collect cash",
      };
    }

    // Get current order
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]`,
      { orderId }
    );

    if (order.cashCollected) {
      return {
        success: false,
        message: "Cash has already been collected for this order",
      };
    }

    await backendClient
      .patch(orderId)
      .set({
        cashCollected: true,
        cashCollectedAmount: cashAmount,
        cashCollectedAt: new Date().toISOString(),
        paymentStatus: "paid",
      })
      .commit();

    await addStatusHistory(
      orderId,
      "Cash Collected",
      employee.email,
      employee.employeeRole,
      `Cash collected: $${cashAmount}`
    );

    // Update employee performance
    const currentPerformance = employee.employeePerformance || {};
    await updateEmployeePerformance(employee._id, {
      cashCollected: (currentPerformance.cashCollected || 0) + cashAmount,
    });

    return {
      success: true,
      message: `Cash collected: $${cashAmount}`,
    };
  } catch (error) {
    console.error("Error collecting cash:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to collect cash",
    };
  }
}

// Deliveryman: Start delivery (out for delivery)
export async function startDelivery(
  orderId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && (employeeRole == "deliveryman" || employeeRole == "incharge")][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only deliverymen can start delivery",
      };
    }

    // Get current order
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]`,
      { orderId }
    );

    if (
      order.assignedDeliverymanId !== employee._id &&
      employee.employeeRole !== "incharge"
    ) {
      return {
        success: false,
        message: "This order is not assigned to you",
      };
    }

    await backendClient
      .patch(orderId)
      .set({
        status: "out_for_delivery",
        deliveryAttempts: (order.deliveryAttempts || 0) + 1,
      })
      .commit();

    await addStatusHistory(
      orderId,
      "Out for Delivery",
      employee.email,
      employee.employeeRole,
      notes
    );

    // Send notification to customer
    try {
      await sendOrderStatusNotification({
        clerkUserId: order.clerkUserId,
        orderNumber: order.orderNumber,
        orderId: order._id,
        status: "out_for_delivery",
      });
    } catch (notificationError) {
      console.error(
        "Failed to send out for delivery notification:",
        notificationError
      );
    }

    return {
      success: true,
      message: "Delivery started successfully",
    };
  } catch (error) {
    console.error("Error starting delivery:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to start delivery",
    };
  }
}

// Deliveryman: Reschedule delivery
export async function rescheduleDelivery(
  orderId: string,
  newDate: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && (employeeRole == "deliveryman" || employeeRole == "incharge")][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only deliverymen can reschedule deliveries",
      };
    }

    await backendClient
      .patch(orderId)
      .set({
        status: "rescheduled",
        rescheduledDate: newDate,
        rescheduledReason: reason,
      })
      .commit();

    await addStatusHistory(
      orderId,
      "Rescheduled",
      employee.email,
      employee.employeeRole,
      `Rescheduled to ${new Date(newDate).toLocaleDateString()}: ${reason}`
    );

    return {
      success: true,
      message: "Delivery rescheduled successfully",
    };
  } catch (error) {
    console.error("Error rescheduling delivery:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to reschedule delivery",
    };
  }
}

// Deliveryman: Mark delivery as failed
export async function markDeliveryFailed(
  orderId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && (employeeRole == "deliveryman" || employeeRole == "incharge")][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only deliverymen can mark delivery as failed",
      };
    }

    // Get current order
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]`,
      { orderId }
    );

    await backendClient
      .patch(orderId)
      .set({
        status: "failed_delivery",
        deliveryAttempts: (order.deliveryAttempts || 0) + 1,
      })
      .commit();

    await addStatusHistory(
      orderId,
      "Failed Delivery",
      employee.email,
      employee.employeeRole,
      `Delivery attempt ${(order.deliveryAttempts || 0) + 1} failed: ${reason}`
    );

    return {
      success: true,
      message: "Delivery marked as failed",
    };
  } catch (error) {
    console.error("Error marking delivery as failed:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to mark delivery as failed",
    };
  }
}

// Accounts: Receive payment from deliveryman
export async function receivePaymentFromDeliveryman(
  orderId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && (employeeRole == "accounts" || employeeRole == "incharge")][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only accounts employees can receive payments",
      };
    }

    // Get current order
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]`,
      { orderId }
    );

    if (!order.cashCollected) {
      return {
        success: false,
        message: "Cash has not been collected for this order",
      };
    }

    if (!order.cashSubmittedToAccounts) {
      return {
        success: false,
        message: "Deliveryman has not submitted the cash yet",
      };
    }

    await backendClient
      .patch(orderId)
      .set({
        cashSubmissionStatus: "confirmed",
        paymentReceivedBy: employee.email,
        paymentReceivedAt: new Date().toISOString(),
        paymentStatus: "paid",
        status: "completed",
      })
      .commit();

    await addStatusHistory(
      orderId,
      "Payment Received & Order Completed",
      employee.email,
      employee.employeeRole,
      notes ||
        `Cash payment received: $${
          order.cashCollectedAmount || order.totalPrice
        }`
    );

    // Update employee performance
    const currentPerformance = employee.employeePerformance || {};
    await updateEmployeePerformance(employee._id, {
      paymentsReceived:
        (currentPerformance.paymentsReceived || 0) +
        (order.cashCollectedAmount || order.totalPrice),
    });

    return { success: true, message: "Payment received successfully" };
  } catch (error) {
    console.error("Error receiving payment:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to receive payment",
    };
  }
}

// Deliveryman: Submit collected cash to accounts
export async function submitCashToAccounts(
  orderId: string,
  accountsEmployeeId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && (employeeRole == "deliveryman" || employeeRole == "incharge")][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only deliverymen can submit cash to accounts",
      };
    }

    // Verify the selected accounts employee exists and is active
    const accountsEmployee = await backendClient.fetch(
      `*[_type == "user" && _id == $accountsEmployeeId && isEmployee == true && (employeeRole == "accounts" || employeeRole == "incharge") && employeeStatus == "active"][0]`,
      { accountsEmployeeId }
    );

    if (!accountsEmployee) {
      return {
        success: false,
        message: "Please select a valid accounts employee",
      };
    }

    // Get current order
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]`,
      { orderId }
    );

    if (!order.cashCollected) {
      return {
        success: false,
        message: "Cash has not been collected for this order",
      };
    }

    if (
      order.cashSubmittedToAccounts &&
      order.cashSubmissionStatus === "pending"
    ) {
      return {
        success: false,
        message: "Cash submission is pending review by accounts team",
      };
    }

    if (
      order.cashSubmittedToAccounts &&
      order.cashSubmissionStatus === "confirmed"
    ) {
      return {
        success: false,
        message: "Cash has already been confirmed by accounts",
      };
    }

    await backendClient
      .patch(orderId)
      .set({
        cashSubmittedToAccounts: true,
        cashSubmissionStatus: "pending",
        cashSubmittedBy: employee.email,
        cashSubmittedAt: new Date().toISOString(),
        cashSubmissionNotes: notes,
        assignedAccountsEmployeeId: accountsEmployeeId,
        assignedAccountsEmployeeName: `${accountsEmployee.firstName} ${accountsEmployee.lastName}`,
      })
      .commit();

    await addStatusHistory(
      orderId,
      "Cash Submitted to Accounts",
      employee.email,
      employee.employeeRole,
      notes ||
        `Cash submitted to ${accountsEmployee.firstName} ${
          accountsEmployee.lastName
        }: $${order.cashCollectedAmount || order.totalPrice}`
    );

    return {
      success: true,
      message: `Cash submitted to ${accountsEmployee.firstName} ${
        accountsEmployee.lastName
      }: $${order.cashCollectedAmount || order.totalPrice}`,
    };
  } catch (error) {
    console.error("Error submitting cash to accounts:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to submit cash to accounts",
    };
  }
}

// Accounts: Reject cash submission from deliveryman
export async function rejectCashSubmission(
  orderId: string,
  rejectionReason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && (employeeRole == "accounts" || employeeRole == "incharge")][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return {
        success: false,
        message: "Only accounts employees can reject cash submissions",
      };
    }

    // Get current order
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]`,
      { orderId }
    );

    if (!order.cashSubmittedToAccounts) {
      return {
        success: false,
        message: "No cash submission found for this order",
      };
    }

    if (order.cashSubmissionStatus === "confirmed") {
      return {
        success: false,
        message: "Cannot reject a confirmed cash submission",
      };
    }

    if (!rejectionReason || rejectionReason.trim() === "") {
      return {
        success: false,
        message: "Please provide a reason for rejection",
      };
    }

    await backendClient
      .patch(orderId)
      .set({
        cashSubmissionStatus: "rejected",
        cashSubmissionRejectionReason: rejectionReason,
        cashSubmittedToAccounts: false,
        assignedAccountsEmployeeId: null,
        assignedAccountsEmployeeName: null,
      })
      .commit();

    await addStatusHistory(
      orderId,
      "Cash Submission Rejected",
      employee.email,
      employee.employeeRole,
      `Rejected by ${employee.firstName} ${employee.lastName}: ${rejectionReason}`
    );

    return {
      success: true,
      message: "Cash submission rejected. Deliveryman can resubmit.",
    };
  } catch (error) {
    console.error("Error rejecting cash submission:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to reject cash submission",
    };
  }
}

// Get orders for employee role
export async function getOrdersForEmployee() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return [];
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return [];
    }

    let filter = "";

    switch (employee.employeeRole) {
      case "callcenter":
        // Show all orders that callcenter works with (pending, address confirmed, and order confirmed)
        filter = `*[_type == "order" && status in ["pending", "address_confirmed", "order_confirmed"]] | order(orderDate desc)`;
        break;
      case "packer":
        // Show all confirmed orders (both packed and unpacked)
        filter = `*[_type == "order" && defined(orderConfirmedBy) && status in ["order_confirmed", "packed"]] | order(orderConfirmedAt desc)`;
        break;
      case "warehouse":
        // Show packed orders ready for delivery assignment
        filter = `*[_type == "order" && status in ["packed", "ready_for_delivery"]] | order(packedAt desc)`;
        break;
      case "deliveryman":
        // Show orders assigned to this deliveryman
        filter = `*[_type == "order" && assignedDeliverymanId == $employeeId && status in ["ready_for_delivery", "out_for_delivery", "delivered", "rescheduled", "failed_delivery"]] | order(dispatchedAt desc)`;
        break;
      case "incharge":
      case "accounts":
        // Show all orders
        filter = `*[_type == "order"] | order(orderDate desc)`;
        break;
      default:
        return [];
    }

    const orders = await backendClient.fetch(
      `${filter} {
        _id,
        orderNumber,
        customerName,
        email,
        phone,
        clerkUserId,
        totalPrice,
        currency,
        status,
        paymentStatus,
        paymentMethod,
        orderDate,
        "shippingAddress": address,
        products[] {
          _key,
          quantity,
          product-> {
            _id,
            name,
            price,
            "image": image.asset->url
          }
        },
        addressConfirmedBy,
        addressConfirmedAt,
        orderConfirmedBy,
        orderConfirmedAt,
        packedBy,
        packedAt,
        packingNotes,
        assignedWarehouseBy,
        assignedWarehouseAt,
        dispatchedBy,
        dispatchedAt,
        assignedDeliverymanId,
        assignedDeliverymanName,
        deliveredBy,
        deliveredAt,
        deliveryNotes,
        deliveryAttempts,
        rescheduledDate,
        rescheduledReason,
        cashCollected,
        cashCollectedAmount,
        cashCollectedAt,
        paymentReceivedBy,
        paymentReceivedAt,
        stripePaymentIntentId,
        stripeCheckoutSessionId,
        paymentCompletedAt,
        statusHistory
      }`,
      { employeeId: employee._id }
    );

    return orders;
  } catch (error) {
    console.error("Error fetching employee orders:", error);
    return [];
  }
}

// Get orders for accounts department
export async function getOrdersForAccounts() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return [];
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return [];
    }

    // Only accounts and incharge can access
    if (!["accounts", "incharge"].includes(employee.employeeRole)) {
      return [];
    }

    // Get orders with cash submitted to accounts, already received, or paid online via Stripe
    const orders = await backendClient.fetch(
      `*[_type == "order" && (cashSubmittedToAccounts == true || paymentReceivedBy != null || stripePaymentIntentId != null)] | order(coalesce(cashSubmittedAt, paymentCompletedAt, orderDate) desc) {
        _id,
        orderNumber,
        customerName,
        email,
        phone,
        clerkUserId,
        totalPrice,
        currency,
        status,
        paymentStatus,
        paymentMethod,
        orderDate,
        "shippingAddress": address,
        products[] {
          _key,
          quantity,
          product-> {
            _id,
            name,
            price,
            "image": image.asset->url
          }
        },
        deliveredAt,
        cashCollected,
        cashCollectedAmount,
        cashCollectedAt,
        cashSubmittedToAccounts,
        cashSubmittedBy,
        cashSubmittedAt,
        cashSubmissionNotes,
        paymentReceivedBy,
        paymentReceivedAt,
        stripePaymentIntentId,
        stripeCheckoutSessionId,
        paymentCompletedAt,
        statusHistory
      }`
    );

    return orders;
  } catch (error) {
    console.error("Error fetching accounts orders:", error);
    return [];
  }
}

// Get payment statistics for accounts
export async function getAccountsPaymentStats() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return null;
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return null;
    }

    // Only accounts and incharge can access
    if (!["accounts", "incharge"].includes(employee.employeeRole)) {
      return null;
    }

    // Get payment statistics
    const stats = await backendClient.fetch(
      `{
        "totalCodRevenue": *[_type == "order" && paymentMethod == "cash_on_delivery" && defined(totalPrice)].totalPrice,
        "codPaidRevenue": *[_type == "order" && paymentMethod == "cash_on_delivery" && paymentStatus == "paid" && defined(totalPrice)].totalPrice,
        "codPendingRevenue": *[_type == "order" && paymentMethod == "cash_on_delivery" && paymentStatus == "pending" && defined(totalPrice)].totalPrice,
        "cardRevenue": *[_type == "order" && (paymentMethod == "card" || paymentMethod == "stripe") && paymentStatus == "paid" && defined(totalPrice)].totalPrice,
        "totalCodOrders": count(*[_type == "order" && paymentMethod == "cash_on_delivery"]),
        "codPaidOrders": count(*[_type == "order" && paymentMethod == "cash_on_delivery" && paymentStatus == "paid"]),
        "codPendingOrders": count(*[_type == "order" && paymentMethod == "cash_on_delivery" && paymentStatus == "pending"]),
        "cardOrders": count(*[_type == "order" && (paymentMethod == "card" || paymentMethod == "stripe") && paymentStatus == "paid"])
      }`
    );

    // Calculate sums from arrays
    const totalCodRevenue = Array.isArray(stats.totalCodRevenue)
      ? stats.totalCodRevenue.reduce(
          (sum: number, price: number) => sum + (price || 0),
          0
        )
      : 0;

    const codPaidRevenue = Array.isArray(stats.codPaidRevenue)
      ? stats.codPaidRevenue.reduce(
          (sum: number, price: number) => sum + (price || 0),
          0
        )
      : 0;

    const codPendingRevenue = Array.isArray(stats.codPendingRevenue)
      ? stats.codPendingRevenue.reduce(
          (sum: number, price: number) => sum + (price || 0),
          0
        )
      : 0;

    const cardRevenue = Array.isArray(stats.cardRevenue)
      ? stats.cardRevenue.reduce(
          (sum: number, price: number) => sum + (price || 0),
          0
        )
      : 0;

    return {
      totalCodRevenue,
      codPaidRevenue,
      codPendingRevenue,
      cardRevenue,
      totalCodOrders: stats.totalCodOrders || 0,
      codPaidOrders: stats.codPaidOrders || 0,
      codPendingOrders: stats.codPendingOrders || 0,
      cardOrders: stats.cardOrders || 0,
    };
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    return null;
  }
}

// Get active accounts employees for selection
export async function getActiveAccountsEmployees() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return [];
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return [];
    }

    // Get all active accounts employees
    const accountsEmployees = await backendClient.fetch(
      `*[_type == "user" && isEmployee == true && (employeeRole == "accounts" || employeeRole == "incharge") && employeeStatus == "active"] | order(firstName asc) {
        _id,
        firstName,
        lastName,
        email,
        employeeRole
      }`
    );

    return accountsEmployees;
  } catch (error) {
    console.error("Error fetching accounts employees:", error);
    return [];
  }
}
