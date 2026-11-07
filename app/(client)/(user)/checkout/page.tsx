import Container from "@/components/Container";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import { ShoppingBag } from "lucide-react";
import { CheckoutContent } from "@/components/checkout/CheckoutContent";
import { notFound } from "next/navigation";
import { getOrderById } from "@/sanity/queries";
import { currentUser } from "@clerk/nextjs/server";
import { OrderCheckoutContent } from "@/components/checkout/OrderCheckoutContent";

interface Props {
  searchParams: Promise<{
    orderId?: string;
  }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const { orderId } = await searchParams;
  const user = await currentUser();

  // If there's an orderId, this is a payment for an existing order
  if (orderId) {
    if (!user) {
      notFound();
    }

    const order = await getOrderById(orderId);
    if (!order || order.clerkUserId !== user.id) {
      notFound();
    }

    return (
      <Container className="py-6">
        {/* Breadcrumb with custom items for payment flow */}
        <DynamicBreadcrumb
          customItems={[
            { label: "Home", href: "/" },
            { label: "Orders", href: "/orders" },
            { label: "Payment" },
          ]}
          className="mb-6"
        />

        {/* Checkout Header */}
        <div className="flex items-center gap-2 mb-6">
          <ShoppingBag className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Complete Payment</h1>
        </div>

        {/* Order Checkout Content */}
        <OrderCheckoutContent order={order} />
      </Container>
    );
  }

  // Regular checkout flow
  return (
    <Container className="py-6">
      {/* Breadcrumb with parent context showing "Home > Dashboard > Cart > Checkout" */}
      <DynamicBreadcrumb
        customItems={[
          { label: "Home", href: "/" },
          { label: "Dashboard", href: "/user" },
          { label: "Cart", href: "/cart" },
          { label: "Checkout" },
        ]}
        className="mb-6"
      />

      {/* Checkout Header */}
      <div className="flex items-center gap-2 mb-6">
        <ShoppingBag className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      {/* Checkout Content */}
      <CheckoutContent />
    </Container>
  );
}
