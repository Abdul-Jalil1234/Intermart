import { backendClient } from "@/sanity/lib/backendClient";
import { siteConfig } from "@/config/site";

/**
 * Server-side pricing. NEVER trust prices sent by the browser: every amount that
 * is charged or stored is recomputed here from the product documents in Sanity.
 */

export type RequestedLine = { productId: string; quantity: number; isPrize?: boolean };

export type PricedLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isPrize: boolean;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
};

export class PricingError extends Error {
  status = 400;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeShipping(subtotal: number): number {
  return subtotal > siteConfig.shipping.freeThreshold || subtotal === 0
    ? 0
    : siteConfig.shipping.fee;
}

export function computeTax(subtotal: number): number {
  const rate = parseFloat(process.env.TAX_AMOUNT || "0") || 0;
  return round2(subtotal * rate);
}

export async function priceCart(requested: RequestedLine[]): Promise<PricedCart> {
  if (!Array.isArray(requested) || requested.length === 0) {
    throw new PricingError("No items provided");
  }
  if (requested.length > 100) throw new PricingError("Too many items");

  const ids = [...new Set(requested.map((r) => r.productId))];
  const products: { _id: string; name?: string; price?: number; stock?: number }[] =
    await backendClient.fetch(
      `*[_type == "product" && _id in $ids]{_id, name, price, stock}`,
      { ids }
    );
  const byId = new Map(products.map((p) => [p._id, p]));

  const lines: PricedLine[] = requested.map((r) => {
    const quantity = Math.floor(Number(r.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      throw new PricingError("Invalid quantity");
    }
    const p = byId.get(r.productId);
    if (!p) throw new PricingError("A product in your cart is no longer available");
    if (!r.isPrize && typeof p.stock === "number" && p.stock < quantity) {
      throw new PricingError(`Not enough stock for ${p.name ?? "a product"}`);
    }
    const unitPrice = r.isPrize ? 0 : round2(Number(p.price) || 0);
    return {
      productId: p._id,
      name: p.name ?? "Product",
      quantity,
      unitPrice,
      lineTotal: round2(unitPrice * quantity),
      isPrize: Boolean(r.isPrize),
    };
  });

  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const shipping = computeShipping(subtotal);
  const tax = computeTax(subtotal);
  return { lines, subtotal, shipping, tax, total: round2(subtotal + shipping + tax) };
}
