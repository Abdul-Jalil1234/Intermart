import type { Metadata } from "next";
import AdminDashboardOverview from "@/components/admin/AdminDashboardOverview";

export const metadata: Metadata = {
  title: "Dashboard - Admin Panel",
  description: "Store overview, sales and pending requests",
};

export default function AdminPage() {
  return <AdminDashboardOverview />;
}
