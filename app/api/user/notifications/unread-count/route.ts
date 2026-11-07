import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";

/**
 * Lightweight unread-notification counter used by the header bell.
 * It runs a single count query (no CDN) so the bell can poll it cheaply.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }

  try {
    const count = await backendClient.fetch<number | null>(
      `coalesce(count(*[_type == "user" && clerkUserId == $userId][0].notifications[read != true]), 0)`,
      { userId }
    );
    return NextResponse.json(
      { count: count ?? 0 },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Unread count error:", error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
