import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { answer, defaultSuggestions, type ChatContext } from "@/lib/chat/engine";

export const runtime = "nodejs";

// Tiny in-memory rate limit (per server instance) — enough to blunt abuse of the endpoint.
const hits = new Map<string, { count: number; reset: number }>();
const LIMIT = 30;
const WINDOW_MS = 60_000;

function limited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

async function resolveContext(): Promise<ChatContext> {
  const { userId } = await auth();
  if (!userId) return { role: "guest", clerkUserId: null };

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress;
    return { role: isUserAdmin(email) ? "admin" : "customer", clerkUserId: userId };
  } catch {
    return { role: "customer", clerkUserId: userId };
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveContext();
    const key = ctx.clerkUserId ?? req.headers.get("x-forwarded-for") ?? "anon";
    if (limited(key)) {
      return NextResponse.json(
        { text: "You're sending messages very quickly — please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message : "";
    if (!message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const reply = await answer(message, ctx);
    return NextResponse.json({ ...reply, role: ctx.role });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { text: "Sorry, I had trouble looking that up. Please try again in a moment." },
      { status: 500 }
    );
  }
}

/** Greeting + role-aware quick replies shown when the widget opens. */
export async function GET() {
  const ctx = await resolveContext();
  return NextResponse.json({ role: ctx.role, suggestions: defaultSuggestions(ctx) });
}
