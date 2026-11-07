import type { Metadata } from "next";
import AdminSubscriptions from "@/components/admin/AdminSubscriptions";

export const metadata: Metadata = {
  title: "Newsletter Subscriptions - Admin Panel",
  description: "Manage newsletter subscriptions",
};

export default function SubscriptionsPage() {
  return <AdminSubscriptions />;
}
