import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";
import { parseProductInput, toSanityFields } from "@/lib/productInput";
import { revalidateStorefront } from "../route";

type Ctx = { params: Promise<{ id: string }> };

/** Update a product. The slug is kept stable so existing links keep working. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;
    const { id } = await params;

    const parsed = parseProductInput(await req.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.errors.join(". "), errors: parsed.errors }, { status: 400 });
    }
    const input = parsed.value;

    const existing = await backendClient.fetch<{ slug?: string } | null>(
      `*[_type == "product" && _id == $id][0]{ "slug": slug.current }`,
      { id }
    );
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    let patch = backendClient.patch(id).set(toSanityFields(input));
    patch = input.brandId
      ? patch.set({ brand: { _type: "reference", _ref: input.brandId } })
      : patch.unset(["brand"]);
    patch = input.status ? patch.set({ status: input.status }) : patch.unset(["status"]);
    await patch.commit();

    revalidateStorefront(existing.slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

/**
 * Delete a product.
 * - Blocked (409) when customer orders reference it: deleting would corrupt order history.
 *   Set its stock to 0 instead.
 * - Reviews of the product are deleted; wishlist and cart entries are removed from users.
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;
    const { id } = await params;

    const product = await backendClient.fetch<{ slug?: string } | null>(
      `*[_type == "product" && _id == $id][0]{ "slug": slug.current }`,
      { id }
    );
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const orderCount = await backendClient.fetch<number>(
      `count(*[_type == "order" && references($id)])`,
      { id }
    );
    if (orderCount > 0) {
      return NextResponse.json(
        {
          error: `This product appears in ${orderCount} order${orderCount === 1 ? "" : "s"} and cannot be deleted. Set its stock to 0 to hide it from sale instead.`,
        },
        { status: 409 }
      );
    }

    const [reviewIds, users] = await Promise.all([
      backendClient.fetch<string[]>(
        `*[_type == "review" && product._ref == $id]._id`,
        { id }
      ),
      backendClient.fetch<{ _id: string }[]>(
        `*[_type == "user" && ($id in wishlist[]._ref || $id in cart[].product._ref)]{ _id }`,
        { id }
      ),
    ]);

    const tx = backendClient.transaction();
    users.forEach((u) =>
      tx.patch(u._id, (p) =>
        p.unset([`wishlist[_ref=="${id}"]`, `cart[product._ref=="${id}"]`])
      )
    );
    reviewIds.forEach((rid) => tx.delete(rid));
    tx.delete(id);
    await tx.commit();

    revalidateStorefront(product.slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
