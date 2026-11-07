import type { Metadata } from "next";
import { redirect } from "next/navigation";
import EmployeeAnalyticsDashboard from "@/components/admin/EmployeeAnalyticsDashboard";
import { getCurrentEmployee } from "@/actions/employeeActions";

export const metadata: Metadata = { title: "Analytics - Employee Dashboard" };

export default async function EmployeeDashboardPage() {
  const employee = await getCurrentEmployee();
  if (!employee?.permissions.canViewAnalytics) redirect("/employee/orders");
  return <EmployeeAnalyticsDashboard />;
}
