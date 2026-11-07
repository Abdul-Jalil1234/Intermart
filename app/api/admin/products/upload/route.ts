import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

/** Upload one image file to the Sanity asset store. Returns the asset id + CDN url. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, WebP, AVIF or GIF images are allowed" }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is larger than 8 MB" }, { status: 413 });
    }

    const asset = await backendClient.assets.upload(
      "image",
      Buffer.from(await file.arrayBuffer()),
      { filename: file.name, contentType: file.type }
    );

    return NextResponse.json({ assetId: asset._id, url: asset.url }, { status: 201 });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
  }
}
