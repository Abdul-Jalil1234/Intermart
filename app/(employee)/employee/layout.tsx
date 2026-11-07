import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import Container from "@/components/Container";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EmployeeNav from "@/components/employee/EmployeeNav";
import { getCurrentEmployee } from "@/actions/employeeActions";
import { isUserAdmin } from "@/lib/adminUtils";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const employee = await getCurrentEmployee();

  if (!employee || employee.status !== "active") {
    const user = await currentUser();
    const isAdmin = isUserAdmin(user?.primaryEmailAddress?.emailAddress);

    return (
      <div className="min-h-screen">
        <Header />
        <Container className="py-16">
          <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900">
              {employee ? "Your employee account is not active" : "No employee role assigned"}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {employee
                ? "Ask an administrator to reactivate your account."
                : "An administrator needs to assign you a role before you can use this area."}
            </p>
            <Link
              href={isAdmin ? "/admin/employees" : "/"}
              className="mt-6 inline-block rounded-lg bg-shop_dark_green px-5 py-2 text-sm font-medium text-white hover:bg-shop_light_green"
            >
              {isAdmin ? "Manage employees" : "Back to store"}
            </Link>
          </div>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <Container className="space-y-6 py-8">
        <EmployeeNav employee={employee} />
        {children}
      </Container>
      <Footer />
    </div>
  );
}
