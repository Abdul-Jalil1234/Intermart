import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";

type AdminCheck =
  | { ok: true; userId: string; email: string }
  | { ok: false; response: NextResponse };

/**
 * Server-side guard for admin-only API routes.
 * Verifies the Clerk session and that the primary email is in NEXT_PUBLIC_ADMIN_EMAIL.
 */
export async function requireAdmin(): Promise<AdminCheck> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();

  if (!email || !isUserAdmin(email)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId, email };
}
