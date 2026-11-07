import type { Metadata } from "next";
import AdminAnalytics from "@/components/admin/AdminAnalyticsNew";

export const metadata: Metadata = {
  title: "Analytics - Admin Panel",
  description: "Sales, customers and product performance",
};

export default function AdminAnalyticsPage() {
  return <AdminAnalytics />;
}
