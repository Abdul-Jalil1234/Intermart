import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";
import {
  parseProductInput,
  slugify,
  toSanityFields,
} from "@/lib/productInput";

const SORTABLE_FIELDS = new Set(["_createdAt", "_updatedAt", "name", "price", "stock"]);

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;
    const client = backendClient;

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("id");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);
    const category = searchParams.get("category") || "";
    const search = (searchParams.get("search") || "").trim();
    const requestedSort = searchParams.get("sortBy") || "_createdAt";
    const sortBy = SORTABLE_FIELDS.has(requestedSort) ? requestedSort : "_createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    if (productId) {
      const product = await client.fetch(
        `*[_type == "product" && _id == $id][0] {
          _id, _type, _createdAt, _updatedAt, _rev,
          name, slug, description, price, discount, stock,
          images[]{ ..., asset->{ _id, url } },
          categories[]->{ _id, title, slug },
          brand->{ _id, title, slug },
          status, variant, isFeatured
        }`,
        { id: productId }
      );

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      return NextResponse.json({
        product: {
          ...product,
          category: product.categories?.[0]
            ? {
                _id: product.categories[0]._id,
                name: product.categories[0].title,
                title: product.categories[0].title,
                slug: product.categories[0].slug,
              }
            : null,
          brand: product.brand
            ? {
                _id: product.brand._id,
                name: product.brand.title,
                title: product.brand.title,
                slug: product.brand.slug,
              }
            : null,
          featured: product.isFeatured,
        },
      });
    }

    const conditions: string[] = [];
    if (category) {
      conditions.push(
        `references(*[_type == "category" && title == $category]._id)`
      );
    }
    if (search) {
      conditions.push(`(name match $search || description match $search)`);
    }
    const filter = conditions.length ? ` && (${conditions.join(" && ")})` : "";
    const params = { category, search: `${search}*`, from: offset, to: offset + limit };

    const [products, totalCount] = await Promise.all([
      client.fetch(
        `*[_type == "product"${filter}] | order(${sortBy} ${sortOrder}) [$from...$to] {
          _id, _createdAt, name, description, price, discount, stock, variant,
          images[]{ asset->{ _id, url }, alt },
          "category": categories[0]->{ _id, "name": title, "title": title },
          "categories": categories[]->{ _id, "name": title, "title": title },
          brand-> { _id, "name": title },
          "featured": isFeatured,
          status
        }`,
        params
      ),
      client.fetch(`count(*[_type == "product"${filter}])`, params),
    ]);

    return NextResponse.json({
      products,
      totalCount,
      hasNextPage: offset + limit < totalCount,
      pagination: {
        limit,
        offset,
        total: totalCount,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Create a product. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const parsed = parseProductInput(await req.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.errors.join(". "), errors: parsed.errors }, { status: 400 });
    }
    const input = parsed.value;

    // Unique slug: name, name-2, name-3, ...
    const base = slugify(input.name) || "product";
    let slug = base;
    for (let n = 2; n < 50; n++) {
      const taken = await backendClient.fetch<number>(
        `count(*[_type == "product" && slug.current == $slug])`,
        { slug }
      );
      if (!taken) break;
      slug = `${base}-${n}`;
    }

    const doc = await backendClient.create({
      _type: "product",
      ...toSanityFields(input),
      slug: { _type: "slug", current: slug },
      ...(input.brandId
        ? { brand: { _type: "reference", _ref: input.brandId } }
        : {}),
      ...(input.status ? { status: input.status } : {}),
      totalReviews: 0,
    });

    revalidateStorefront(slug);
    return NextResponse.json({ product: { _id: doc._id, slug } }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

export function revalidateStorefront(slug?: string) {
  for (const path of ["/", "/shop", "/deal", "/product", "/admin/products"]) {
    revalidatePath(path);
  }
  if (slug) revalidatePath(`/product/${slug}`);
}
