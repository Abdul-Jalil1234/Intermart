import type { Metadata } from "next";
import EmployeeOrderManagement from "@/components/admin/EmployeeOrderManagement";

export const metadata: Metadata = { title: "Orders - Employee Dashboard" };

export default function EmployeeOrdersPage() {
  return <EmployeeOrderManagement />;
}
