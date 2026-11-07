import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/actions/employeeActions";

export default async function EmployeePage() {
  const employee = await getCurrentEmployee();
  redirect(
    employee?.role === "incharge" && employee.permissions.canViewAnalytics
      ? "/employee/dashboard"
      : "/employee/orders"
  );
}
