import type { Metadata } from "next";
import AdminReviews from "@/components/admin/AdminReviews";

export const metadata: Metadata = {
  title: "Reviews - Admin Panel",
  description: "Moderate customer reviews",
};

export default function AdminReviewsPage() {
  return <AdminReviews />;
}
