/**
 * Validation + normalisation for product payloads sent from the admin panel.
 * Hand-rolled on purpose so no new dependency is needed.
 */

export const PRODUCT_STATUSES = ["new", "hot", "sale"] as const;
export const PRODUCT_VARIANTS = [
  "gadget",
  "appliances",
  "refrigerators",
  "others",
] as const;

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  discount: number;
  stock: number;
  categoryIds: string[];
  brandId: string | null;
  status: (typeof PRODUCT_STATUSES)[number] | null;
  variant: (typeof PRODUCT_VARIANTS)[number];
  isFeatured: boolean;
  /** Sanity image asset ids, in display order. */
  imageAssetIds: string[];
}

type Result =
  | { ok: true; value: ProductInput }
  | { ok: false; errors: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function parseProductInput(body: unknown): Result {
  const errors: string[] = [];
  if (!isRecord(body)) return { ok: false, errors: ["Invalid request body"] };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 120) {
    errors.push("Name must be between 2 and 120 characters");
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (description.length > 2000) errors.push("Description is too long");

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) errors.push("Price must be 0 or more");

  const discount = body.discount === undefined || body.discount === "" ? 0 : Number(body.discount);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    errors.push("Discount must be a percentage between 0 and 100");
  }

  const stock = body.stock === undefined || body.stock === "" ? 0 : Number(body.stock);
  if (!Number.isInteger(stock) || stock < 0) errors.push("Stock must be a whole number, 0 or more");

  const categoryIds = Array.isArray(body.categoryIds)
    ? body.categoryIds.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];

  const brandId =
    typeof body.brandId === "string" && body.brandId ? body.brandId : null;

  const status =
    typeof body.status === "string" && body.status && body.status !== "none"
      ? body.status
      : null;
  if (status && !(PRODUCT_STATUSES as readonly string[]).includes(status)) {
    errors.push("Invalid status");
  }

  const variant = typeof body.variant === "string" ? body.variant : "others";
  if (!(PRODUCT_VARIANTS as readonly string[]).includes(variant)) {
    errors.push("Invalid product type");
  }

  const imageAssetIds = Array.isArray(body.imageAssetIds)
    ? body.imageAssetIds.filter(
        (x): x is string => typeof x === "string" && /^image-[A-Za-z0-9]+-\d+x\d+-[a-z]+$/.test(x)
      )
    : [];
  if (imageAssetIds.length > 8) errors.push("A product can have at most 8 images");

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      description,
      price,
      discount,
      stock,
      categoryIds,
      brandId,
      status: status as ProductInput["status"],
      variant: variant as ProductInput["variant"],
      isFeatured: body.isFeatured === true,
      imageAssetIds,
    },
  };
}

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);

/** Build the Sanity fields shared by create and update. */
export function toSanityFields(input: ProductInput) {
  const key = () => Math.random().toString(36).slice(2, 12);
  return {
    name: input.name,
    description: input.description,
    price: input.price,
    discount: input.discount,
    stock: input.stock,
    variant: input.variant,
    isFeatured: input.isFeatured,
    categories: input.categoryIds.map((id) => ({
      _key: key(),
      _type: "reference" as const,
      _ref: id,
    })),
    images: input.imageAssetIds.map((id) => ({
      _key: key(),
      _type: "image" as const,
      asset: { _type: "reference" as const, _ref: id },
    })),
  };
}
