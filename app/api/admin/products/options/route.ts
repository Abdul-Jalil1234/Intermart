import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";

/** Categories and brands for the product form dropdowns. */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const [categories, brands] = await Promise.all([
    backendClient.fetch(`*[_type == "category"] | order(title asc){ _id, title }`),
    backendClient.fetch(`*[_type == "brand"] | order(title asc){ _id, title }`),
  ]);
  return NextResponse.json({ categories, brands });
}
