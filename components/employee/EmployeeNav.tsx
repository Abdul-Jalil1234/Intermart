"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getRoleDisplayName, type Employee } from "@/types/employee";

interface EmployeeNavProps {
  employee: Employee;
}

export default function EmployeeNav({ employee }: EmployeeNavProps) {
  const pathname = usePathname();

  const items = [
    {
      label: "Orders",
      href: "/employee/orders",
      icon: ClipboardList,
      visible: employee.permissions.canViewOrders,
    },
    {
      label: "Analytics",
      href: "/employee/dashboard",
      icon: LayoutDashboard,
      visible: employee.permissions.canViewAnalytics,
    },
  ].filter((item) => item.visible);

  return (
    <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <span>
            {employee.firstName} {employee.lastName}
          </span>
          <Badge variant="secondary">{getRoleDisplayName(employee.role)}</Badge>
        </div>
      </div>
      <nav className="flex gap-2">
        {items.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-shop_dark_green text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
