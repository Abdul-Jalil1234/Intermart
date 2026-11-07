#!/usr/bin/env node
/**
 * Seeds your Sanity dataset with demo supermarket content for the storefront:
 * categories, brands, products, banners, an author, blog categories and blog posts.
 *
 *   pnpm seed              create or update the demo content (safe to re-run)
 *   pnpm seed:reset        delete previously seeded demo content, then seed again
 *   pnpm seed:dry          validate the data and print a summary; no network, no writes
 *
 * Needs, in .env: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and
 * SANITY_API_TOKEN (a token with Editor/write access to YOUR project).
 *
 * Every seeded document has an _id starting with "seed-", so re-running replaces them
 * in place and --reset only ever deletes those. Your own content is never touched.
 *
 * Images are REAL photographs searched on Pixabay or Unsplash and uploaded into your Sanity
 * dataset (so nothing is hot-linked). Set one of these in .env:
 *
 *   PIXABAY_API_KEY=...        free key: https://pixabay.com/api/docs/
 *   UNSPLASH_ACCESS_KEY=...    free key: https://unsplash.com/developers  (demo apps: 50 req/hour)
 *   PHOTO_PROVIDER=pixabay|unsplash   optional; defaults to Pixabay when both keys are set
 *
 * With no key, generated placeholders (placehold.co) are used so the seed still works.
 * Search results are cached in scripts/.photo-cache.json, so re-runs cost no API calls.
 * Photographer credit is stored on every uploaded asset (source.name / source.url).
 */

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const RESET = args.has("--reset");

// ---------------------------------------------------------------- data

// Demo supermarket content. Replace it with your real catalogue (see README: "Importing your catalogue").
// The store name comes from .env so the same script works for any store.
const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || "Intermart";

const CATEGORIES = [
  // slug, title, description, "starting from" price, featured on the home page
  ["fruits-vegetables", "Fruits & Vegetables", "Fresh, seasonal fruit and vegetables.", 1, true],
  ["dairy-eggs", "Dairy & Eggs", "Milk, yoghurt, cheese, butter and eggs.", 1, true],
  ["bakery", "Bakery", "Fresh bread, rolls and pastries.", 1, true],
  ["meat-fish", "Meat & Fish", "Quality meat, poultry and seafood.", 5, true],
  ["rice-pasta-grains", "Rice, Pasta & Grains", "Pantry staples for every kitchen.", 1, true],
  ["canned-packaged", "Canned & Packaged Foods", "Tinned goods, oils and cooking essentials.", 1, false],
  ["snacks-sweets", "Snacks & Sweets", "Crisps, biscuits, chocolate and nuts.", 1, true],
  ["beverages", "Beverages", "Water, juices, tea, coffee and soft drinks.", 1, true],
  ["household", "Household & Cleaning", "Cleaning products and home essentials.", 2, true],
  ["personal-care", "Personal Care", "Hair, skin and oral care.", 2, false],
];

// Fictional brands, so no real trademarks are used in demo data.
const BRANDS = [
  ["fresh-fields", "Fresh Fields", "Farm-fresh produce."],
  ["daily-dairy-co", "Daily Dairy Co", "Fresh dairy every day."],
  ["golden-harvest", "Golden Harvest", "Bakery and pantry staples."],
  ["ocean-catch", "Ocean Catch", "Fish, seafood and quality meat."],
  ["bright-bite", "Bright Bite", "Snacks, drinks and packaged foods."],
  ["pure-home", "Pure Home", "Household and personal care."],
];

// name, category, brand, variant, price, discount %, stock, status, featured
// Prices are demo values; real prices come from your catalogue import.
const PRODUCTS = [
  ["Fresh Bananas 1kg", "fruits-vegetables", "fresh-fields", "others", 1.99, 0, 120, "hot", true],
  ["Red Apples 1kg", "fruits-vegetables", "fresh-fields", "others", 3.49, 10, 90, "sale", false],
  ["Ripe Tomatoes 500g", "fruits-vegetables", "fresh-fields", "others", 1.49, 0, 100, undefined, false],
  ["Fresh Carrots 1kg", "fruits-vegetables", "fresh-fields", "others", 1.29, 0, 110, undefined, false],
  ["Potatoes 2kg", "fruits-vegetables", "fresh-fields", "others", 2.49, 0, 140, undefined, false],
  ["Onions 1kg", "fruits-vegetables", "fresh-fields", "others", 1.19, 0, 150, undefined, false],
  ["Fresh Lemons 500g", "fruits-vegetables", "fresh-fields", "others", 1.79, 0, 80, "new", false],
  ["Green Cabbage", "fruits-vegetables", "fresh-fields", "others", 1.59, 0, 60, undefined, false],

  ["Whole Milk 1L", "dairy-eggs", "daily-dairy-co", "others", 1.49, 0, 200, "hot", true],
  ["Semi-Skimmed Milk 1L", "dairy-eggs", "daily-dairy-co", "others", 1.39, 0, 180, undefined, false],
  ["Natural Yoghurt 500g", "dairy-eggs", "daily-dairy-co", "others", 1.99, 0, 85, undefined, false],
  ["Cheddar Cheese 250g", "dairy-eggs", "daily-dairy-co", "others", 3.99, 15, 60, "sale", false],
  ["Salted Butter 250g", "dairy-eggs", "daily-dairy-co", "others", 2.99, 0, 75, undefined, false],
  ["Free-Range Eggs 12 Pack", "dairy-eggs", "daily-dairy-co", "others", 3.49, 0, 95, "new", true],

  ["Sliced White Bread 600g", "bakery", "golden-harvest", "others", 1.49, 0, 70, undefined, false],
  ["Wholemeal Bread 600g", "bakery", "golden-harvest", "others", 1.79, 0, 55, "new", false],
  ["Butter Croissants 4 Pack", "bakery", "golden-harvest", "others", 2.99, 10, 40, "sale", true],
  ["Plain Baguette", "bakery", "golden-harvest", "others", 1.19, 0, 45, undefined, false],

  ["Chicken Breast Fillets 1kg", "meat-fish", "ocean-catch", "others", 7.99, 10, 35, "hot", true],
  ["Fresh Fish Fillets 500g", "meat-fish", "ocean-catch", "others", 6.49, 0, 30, undefined, false],
  ["Minced Beef 500g", "meat-fish", "ocean-catch", "others", 5.49, 0, 38, undefined, false],
  ["Frozen Prawns 500g", "meat-fish", "ocean-catch", "others", 8.99, 5, 25, "new", false],

  ["Basmati Rice 5kg", "rice-pasta-grains", "golden-harvest", "others", 9.99, 10, 50, "hot", true],
  ["Long Grain Rice 2kg", "rice-pasta-grains", "golden-harvest", "others", 3.99, 0, 80, undefined, false],
  ["Spaghetti 500g", "rice-pasta-grains", "golden-harvest", "others", 1.29, 0, 130, undefined, false],
  ["Plain Flour 1kg", "rice-pasta-grains", "golden-harvest", "others", 1.49, 0, 90, undefined, false],
  ["Split Peas (Dholl) 1kg", "rice-pasta-grains", "golden-harvest", "others", 2.49, 0, 70, undefined, false],

  ["Chopped Tomatoes 400g Tin", "canned-packaged", "bright-bite", "others", 0.99, 0, 160, undefined, false],
  ["Baked Beans 410g", "canned-packaged", "bright-bite", "others", 1.09, 0, 140, undefined, false],
  ["Tuna Chunks in Oil 160g", "canned-packaged", "bright-bite", "others", 1.89, 10, 100, "sale", false],
  ["Sunflower Cooking Oil 1L", "canned-packaged", "bright-bite", "others", 2.99, 0, 85, undefined, false],

  ["Potato Crisps 150g", "snacks-sweets", "bright-bite", "others", 1.49, 0, 120, "hot", false],
  ["Milk Chocolate Bar 100g", "snacks-sweets", "bright-bite", "others", 1.29, 0, 150, undefined, false],
  ["Digestive Biscuits 400g", "snacks-sweets", "bright-bite", "others", 1.99, 0, 90, undefined, false],
  ["Salted Peanuts 200g", "snacks-sweets", "bright-bite", "others", 2.19, 0, 75, "new", false],

  ["Still Water 1.5L", "beverages", "bright-bite", "others", 0.69, 0, 300, undefined, false],
  ["Orange Juice 1L", "beverages", "bright-bite", "others", 2.29, 10, 80, "sale", true],
  ["Black Tea Bags 100 Pack", "beverages", "bright-bite", "others", 2.99, 0, 90, undefined, false],
  ["Instant Coffee 200g", "beverages", "bright-bite", "others", 4.99, 15, 60, "sale", false],
  ["Cola 2L", "beverages", "bright-bite", "others", 1.99, 0, 110, undefined, false],

  ["Dishwashing Liquid 750ml", "household", "pure-home", "others", 1.79, 0, 100, undefined, false],
  ["Laundry Detergent 2kg", "household", "pure-home", "others", 7.49, 10, 45, "hot", true],
  ["Toilet Tissue 9 Rolls", "household", "pure-home", "others", 4.49, 0, 80, undefined, false],
  ["Kitchen Towel 2 Rolls", "household", "pure-home", "others", 2.29, 0, 65, undefined, false],
  ["All-Purpose Cleaner 750ml", "household", "pure-home", "others", 2.49, 0, 70, "new", false],

  ["Shampoo 400ml", "personal-care", "pure-home", "others", 3.99, 10, 55, "sale", false],
  ["Toothpaste 100ml", "personal-care", "pure-home", "others", 1.99, 0, 110, undefined, false],
  ["Bar Soap 4 Pack", "personal-care", "pure-home", "others", 2.49, 0, 95, undefined, false],
  ["Hand Wash 250ml", "personal-care", "pure-home", "others", 1.89, 0, 85, "new", false],
];

const CATEGORY_BLURB = {
  "fruits-vegetables": "Fresh, carefully selected and delivered at their best.",
  "dairy-eggs": "Kept cold from supplier to doorstep for maximum freshness.",
  bakery: "Baked fresh and ideal for breakfast, lunch or snacks.",
  "meat-fish": "Quality cuts, packed and chilled for safe delivery.",
  "rice-pasta-grains": "A reliable pantry staple for everyday cooking.",
  "canned-packaged": "Long shelf life and always handy in the cupboard.",
  "snacks-sweets": "Tasty treats for sharing or enjoying on your own.",
  beverages: "Refreshing drinks for the whole family.",
  household: "Keeps your home clean and fresh.",
  "personal-care": "Everyday care products for the whole family.",
};

// Search terms for photos (Pixabay/Unsplash). Product queries come from the product name with
// sizes and pack counts removed; the category term is the fallback.
const CATEGORY_QUERY = {
  "fruits-vegetables": "fresh fruit and vegetables",
  "dairy-eggs": "dairy milk eggs",
  bakery: "fresh bread bakery",
  "meat-fish": "fresh meat and fish",
  "rice-pasta-grains": "rice pasta grains",
  "canned-packaged": "canned food pantry",
  "snacks-sweets": "snacks chocolate biscuits",
  beverages: "drinks beverages bottles",
  household: "cleaning products household",
  "personal-care": "personal care shampoo soap",
};
const productQueries = (name, cat) => {
  const cleaned = name
    .replace(/\(.*?\)/g, " ")
    .replace(/\b\d+(\.\d+)?\s?(kg|g|l|ml|pack|pk|rolls|tin)?\b/gi, " ")
    .replace(/\b(pack|rolls|tin|bag|bags|fresh|ripe|plain)\b/gi, " ")
    .replace(/[^a-zA-Z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return [cleaned, CATEGORY_QUERY[cat]].filter(Boolean);
};
const BANNER_QUERY = ["supermarket groceries", "fresh vegetables market", "shopping basket groceries"];

const BANNERS = [
  {
    id: "seed-banner-fresh-savings",
    title: "Fresh Savings Every Day",
    description: "Fresh produce, bakery and dairy at great prices, delivered to your door.",
    badge: "Fresh Deals",
    discountAmount: 30,
  },
  {
    id: "seed-banner-weekly-specials",
    title: "Weekly Specials & Rewards",
    description: "Sign up to earn points on every order and get early access to weekly specials.",
    badge: "Members Get More",
    discountAmount: 20,
  },
  {
    id: "seed-banner-free-delivery",
    title: "Free Delivery on Bigger Baskets",
    description: "Fast, tracked delivery with free shipping above the minimum order value.",
    badge: "Free Delivery",
    discountAmount: 15,
  },
];

const AUTHOR = { id: "seed-author-store-team", name: `${COMPANY} Team`, slug: "store-team" };

const BLOG_CATEGORIES = [
  ["food-tips", "Food Tips", "Simple advice for buying, storing and cooking food."],
  ["recipes", "Recipe Ideas", "Quick, affordable meals for busy weeks."],
  ["company-news", "Store News", `Updates from the ${COMPANY} team.`],
];

const POSTS = [
  {
    slug: "how-to-choose-fresh-fruit-and-vegetables",
    title: "How to Choose Fresh Fruit and Vegetables",
    category: "food-tips",
    published: "2026-09-12T09:00:00Z",
    heading: "Use your eyes, hands and nose",
    photoQuery: "fresh vegetables market",
    paragraphs: [
      "Look for bright, even colour and firm skin. Avoid produce with soft spots, wrinkles or mould, and choose items that feel heavy for their size, which usually means they are juicy.",
      "Smell helps too: ripe fruit such as melons, pineapples and peaches has a sweet aroma at the stem end. Buy what you will use in the next few days and keep the rest of the shopping list for the next order.",
      "When you order online, choose items marked fresh or in season. They are usually the best value and the best tasting.",
    ],
  },
  {
    slug: "store-food-properly-to-cut-waste",
    title: "Store Food Properly to Cut Waste",
    category: "food-tips",
    published: "2026-09-26T09:00:00Z",
    heading: "Small habits that save money",
    photoQuery: "refrigerator food storage",
    paragraphs: [
      "Keep your fridge at or below 5°C and store raw meat and fish on the bottom shelf so nothing drips onto other food. Keep bread in a cool, dry place and freeze what you will not finish within two days.",
      "Store tomatoes, potatoes and onions in a cool cupboard rather than the fridge, and keep leafy vegetables wrapped in a damp cloth in the crisper drawer.",
      "Check use-by dates when you unpack, and move the oldest items to the front so they are eaten first.",
    ],
  },
  {
    slug: "quick-weeknight-dinners-on-a-budget",
    title: "Quick Weeknight Dinners on a Budget",
    category: "recipes",
    published: "2026-10-03T09:00:00Z",
    heading: "Five ingredients, thirty minutes",
    photoQuery: "family dinner cooking",
    paragraphs: [
      "Rice, lentils or pasta make a filling base. Add a tin of chopped tomatoes, an onion and whatever vegetables you have, and you can have dinner on the table in half an hour.",
      "Chicken fillets and eggs are budget-friendly proteins that cook fast. Make a double batch and use the leftovers for tomorrow's lunch.",
      "Check this week's specials for the best prices on pantry staples.",
    ],
  },
  {
    slug: "whats-new-at-the-store",
    title: "What's New This Season",
    category: "company-news",
    published: "2026-10-14T09:00:00Z",
    heading: "More choice, delivered to your door",
    photoQuery: "supermarket groceries",
    paragraphs: [
      "We have refreshed our online range with more fresh produce, bakery and everyday household items, and we are adding new products every week.",
      "Orders are packed carefully and tracked from confirmation to delivery, and you will be notified at every step.",
      "Browse the categories to see current prices and weekly specials.",
    ],
  },
];

// ---------------------------------------------------------------- helpers

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ref = (id) => ({ _type: "reference", _ref: id });
const slug = (current) => ({ _type: "slug", current });
const ids = {
  category: (s) => `seed-category-${s}`,
  brand: (s) => `seed-brand-${s}`,
  product: (s) => `seed-product-${s}`,
  blogCategory: (s) => `seed-blogcategory-${s}`,
  blog: (s) => `seed-blog-${s}`,
};
const toSlug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const PALETTE = [
  ["0f766e", "ecfeff"],
  ["1d4ed8", "eff6ff"],
  ["b45309", "fffbeb"],
  ["7c3aed", "f5f3ff"],
  ["be123c", "fff1f2"],
  ["15803d", "f0fdf4"],
  ["334155", "f8fafc"],
];
const placeholder = (label, w, h, i = 0) => {
  const [bg, fg] = PALETTE[i % PALETTE.length];
  const text = encodeURIComponent(label).replace(/%20/g, "+");
  return `https://placehold.co/${w}x${h}/${bg}/${fg}/png?text=${text}`;
};

const block = (text, style, key) => ({
  _type: "block",
  _key: key,
  style,
  markDefs: [],
  children: [{ _type: "span", _key: `${key}-s`, text, marks: [] }],
});

// ---------------------------------------------------------------- validate

function validate() {
  const problems = [];
  const catSlugs = new Set(CATEGORIES.map((c) => c[0]));
  const brandSlugs = new Set(BRANDS.map((b) => b[0]));
  const names = new Set();
  const variants = ["gadget", "appliances", "refrigerators", "others"];
  const statuses = ["new", "hot", "sale", undefined];

  for (const [name, cat, brand, variant, price, discount, stock, status] of PRODUCTS) {
    if (!catSlugs.has(cat)) problems.push(`"${name}": unknown category "${cat}"`);
    if (!brandSlugs.has(brand)) problems.push(`"${name}": unknown brand "${brand}"`);
    if (!variants.includes(variant)) problems.push(`"${name}": bad variant "${variant}"`);
    if (!statuses.includes(status)) problems.push(`"${name}": bad status "${status}"`);
    if (!(price > 0)) problems.push(`"${name}": price must be > 0`);
    if (!(discount >= 0)) problems.push(`"${name}": discount must be >= 0`);
    if (!(stock >= 0)) problems.push(`"${name}": stock must be >= 0`);
    const s = toSlug(name);
    if (names.has(s)) problems.push(`duplicate product slug "${s}"`);
    names.add(s);
  }
  for (const p of POSTS) {
    if (!BLOG_CATEGORIES.some((c) => c[0] === p.category)) {
      problems.push(`post "${p.title}": unknown blog category "${p.category}"`);
    }
  }
  return problems;
}

function summary() {
  const byVariant = {};
  for (const p of PRODUCTS) byVariant[p[3]] = (byVariant[p[3]] || 0) + 1;
  const wheelEligible = PRODUCTS.filter((p) => p[6] > 0 && p[4] <= 50).length;
  return [
    `categories: ${CATEGORIES.length} (${CATEGORIES.filter((c) => c[4]).length} featured)`,
    `brands: ${BRANDS.length}`,
    `products: ${PRODUCTS.length} ${JSON.stringify(byVariant)}`,
    `  in stock and <= $50 (eligible for the Spin & Win wheel): ${wheelEligible}`,
    `banners: ${BANNERS.length}`,
    `author: 1, blog categories: ${BLOG_CATEGORIES.length}, blog posts: ${POSTS.length}`,
  ].join("\n");
}

// ---------------------------------------------------------------- main

const problems = validate();
if (problems.length) {
  console.error("Seed data is invalid:\n- " + problems.join("\n- "));
  process.exit(1);
}

if (DRY) {
  console.log("Dry run: data is valid, nothing was uploaded or written.\n");
  console.log(summary());
  process.exit(0);
}

const need = (key) => {
  const value = process.env[key];
  if (!value) {
    console.error(
      `Missing ${key}. Add it to .env (see .env.example) and run via "pnpm seed" so .env is loaded.`
    );
    process.exit(1);
  }
  return value;
};

const projectId = need("NEXT_PUBLIC_SANITY_PROJECT_ID");
const dataset = need("NEXT_PUBLIC_SANITY_DATASET");
const token = need("SANITY_API_TOKEN");

const { createClient } = await import("@sanity/client");
const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-11-09",
  token,
  useCdn: false,
});

console.log(
  `Seeding project ${client.config().projectId}, dataset "${client.config().dataset}"\n`
);


// ---------------------------------------------------------------- photo search

const PIXABAY_KEY = process.env.PIXABAY_API_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const PROVIDER =
  process.env.PHOTO_PROVIDER === "unsplash" && UNSPLASH_KEY
    ? "unsplash"
    : PIXABAY_KEY
      ? "pixabay"
      : UNSPLASH_KEY
        ? "unsplash"
        : null;

if (PROVIDER) console.log(`Photo source: ${PROVIDER}`);
else console.warn("No PIXABAY_API_KEY or UNSPLASH_ACCESS_KEY set — using placeholder images.\n");

const { readFile, writeFile } = await import("node:fs/promises");
const CACHE_FILE = new URL("./.photo-cache.json", import.meta.url);
let searchCache = {};
try {
  searchCache = JSON.parse(await readFile(CACHE_FILE, "utf8"));
} catch {
  /* first run */
}
const searchJobs = new Map();

async function searchProvider(query) {
  if (PROVIDER === "pixabay") {
    const url =
      `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query.slice(0, 100))}` +
      `&image_type=photo&orientation=horizontal&safesearch=true&order=popular&per_page=30`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
    const data = await res.json();
    return (data.hits ?? []).map((h) => ({
      id: `pixabay-${h.id}`,
      url: h.largeImageURL,
      credit: h.user,
      page: h.pageURL,
    }));
  }
  const url =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
    `&per_page=30&content_filter=high`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } });
  if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((r) => ({
    id: `unsplash-${r.id}`,
    url: `${r.urls.raw}&w=1200&q=80&fm=jpg&fit=max`,
    credit: r.user?.name,
    page: `${r.links.html}?utm_source=store_seed&utm_medium=referral`,
    track: r.links.download_location,
  }));
}

async function searchPhotos(query) {
  if (!PROVIDER) return [];
  const key = `${PROVIDER}:${query.toLowerCase()}`;
  if (searchCache[key]) return searchCache[key];
  if (!searchJobs.has(key)) {
    searchJobs.set(
      key,
      (async () => {
        try {
          const results = await searchProvider(query);
          if (results.length) searchCache[key] = results;
          return results;
        } catch (error) {
          console.warn(`  ! photo search failed for "${query}": ${error.message}`);
          return [];
        }
      })()
    );
  }
  return searchJobs.get(key);
}

const usedPhotos = new Set();

/** Returns the next unused photo for the first query that has results. */
async function pickPhoto(queries) {
  for (const query of queries) {
    const results = await searchPhotos(query);
    const hit = results.find((r) => !usedPhotos.has(r.id));
    if (hit) {
      usedPhotos.add(hit.id);
      return hit;
    }
  }
  return null;
}

// Upload images (cached, retried, a few at a time).
const uploads = new Map();
async function uploadImage(url, filename, photo = null) {
  if (uploads.has(url)) return uploads.get(url);
  const job = (async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
        const asset = await client.assets.upload("image", buffer, {
          filename,
          contentType,
          ...(photo
            ? {
                source: { id: photo.id, name: `${PROVIDER}${photo.credit ? ` — ${photo.credit}` : ""}`, url: photo.page },
              }
            : {}),
        });
        if (photo?.track) fetch(photo.track, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }).catch(() => {});
        return { _type: "image", asset: ref(asset._id) };
      } catch (error) {
        if (attempt === 3) {
          console.warn(`  ! could not upload ${filename}: ${error.message}`);
          return null;
        }
        await sleep(600 * attempt);
      }
    }
  })();
  uploads.set(url, job);
  return job;
}

/**
 * A real photo for `queries` (tried in order), or a labelled placeholder when no photo
 * provider is configured / nothing was found.
 */
async function photoImage({ queries, filename, label, w, h, i = 0 }) {
  const picked = await pickPhoto(queries);
  if (picked) return uploadImage(picked.url, filename.replace(/\.png$/, ".jpg"), picked);
  return uploadImage(placeholder(label, w, h, i), filename);
}

async function inBatches(items, size, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return results;
}

async function commit(label, docs) {
  for (let i = 0; i < docs.length; i += 50) {
    const tx = client.transaction();
    docs.slice(i, i + 50).forEach((doc) => tx.createOrReplace(doc));
    await tx.commit();
  }
  console.log(`  ${label}: ${docs.length}`);
}

if (RESET) {
  const old = await client.fetch(`*[_id match "seed-*"]._id`);
  if (old.length) {
    const tx = client.transaction();
    old.forEach((id) => tx.delete(id));
    try {
      await tx.commit();
      console.log(`Deleted ${old.length} previously seeded documents.\n`);
    } catch (error) {
      console.error(
        "Could not delete old seeded documents (an order may reference a seeded product):",
        error.message
      );
      process.exit(1);
    }
  }
}

console.log("Uploading images...");
const categoryDocs = await inBatches(CATEGORIES, 4, async ([s, title, description, range, featured], i) => ({
  _id: ids.category(s),
  _type: "category",
  title,
  slug: slug(s),
  description,
  range,
  featured,
  image: await photoImage({ queries: [CATEGORY_QUERY[s]], filename: `category-${s}.png`, label: title, w: 600, h: 600, i }),
}));

const brandDocs = await inBatches(BRANDS, 4, async ([s, title, description], i) => ({
  _id: ids.brand(s),
  _type: "brand",
  title,
  slug: slug(s),
  description,
  image: await uploadImage(placeholder(title, 400, 400, i + 3), `brand-${s}.png`), // brands are fictional: logo-style placeholders on purpose
}));

const authorDoc = {
  _id: AUTHOR.id,
  _type: "author",
  name: AUTHOR.name,
  slug: slug(AUTHOR.slug),
  image: await uploadImage(placeholder("Intermart", 300, 300, 0), "author-store.png"),
};

const blogCategoryDocs = BLOG_CATEGORIES.map(([s, title, description]) => ({
  _id: ids.blogCategory(s),
  _type: "blogcategory",
  title,
  slug: slug(s),
  description,
}));

// Referenced documents must exist before the documents that point at them.
console.log("\nWriting documents...");
await commit("categories", categoryDocs);
await commit("brands", brandDocs);
await commit("authors", [authorDoc]);
await commit("blog categories", blogCategoryDocs);

const productDocs = await inBatches(PRODUCTS, 5, async (row, index) => {
  const [name, cat, brand, variant, price, discount, stock, status, featured] = row;
  const s = toSlug(name);
  const queries = productQueries(name, cat);
  const front = await photoImage({ queries, filename: `${s}-1.png`, label: name, w: 800, h: 800, i: index });
  const back = await photoImage({ queries, filename: `${s}-2.png`, label: `${name} (side)`, w: 800, h: 800, i: index + 2 });
  return {
    _id: ids.product(s),
    _type: "product",
    name,
    slug: slug(s),
    images: [front, back]
      .filter(Boolean)
      .map((image, i) => ({ ...image, _key: `${s}-img-${i}` })),
    description: `${name}. ${CATEGORY_BLURB[cat]}`,
    price,
    discount,
    categories: [{ ...ref(ids.category(cat)), _key: `${s}-cat` }],
    stock,
    brand: ref(ids.brand(brand)),
    ...(status ? { status } : {}),
    variant,
    isFeatured: featured,
    totalReviews: 0,
  };
});
await commit("products", productDocs);

const bannerDocs = await inBatches(BANNERS, 3, async (b, i) => ({
  _id: b.id,
  _type: "banner",
  title: b.title,
  description: b.description,
  badge: b.badge,
  discountAmount: b.discountAmount,
  image: await photoImage({ queries: [BANNER_QUERY[i % BANNER_QUERY.length], "ecommerce shopping"], filename: `${b.id}.png`, label: b.title, w: 1200, h: 600, i: i + 1 }),
}));
await commit("banners", bannerDocs);

const postDocs = await inBatches(POSTS, 4, async (post, i) => ({
  _id: ids.blog(post.slug),
  _type: "blog",
  title: post.title,
  slug: slug(post.slug),
  author: ref(AUTHOR.id),
  mainImage: await photoImage({ queries: [post.photoQuery ?? "groceries", "supermarket"], filename: `blog-${post.slug}.png`, label: post.title, w: 1200, h: 600, i: i + 2 }),
  blogcategories: [{ ...ref(ids.blogCategory(post.category)), _key: `${post.slug}-cat` }],
  publishedAt: post.published,
  isLatest: true,
  body: [
    block(post.heading, "h2", `${post.slug}-h`),
    ...post.paragraphs.map((text, n) => block(text, "normal", `${post.slug}-p${n}`)),
  ],
}));
await commit("blog posts", postDocs);

const failed = [...uploads.values()].length - (await Promise.all(uploads.values())).filter(Boolean).length;
console.log(
  `\nDone.${failed ? ` ${failed} image(s) failed to upload; re-run "pnpm seed" to retry them.` : ""}`
);
await writeFile(CACHE_FILE, JSON.stringify(searchCache, null, 1)).catch(() => {});
if (!PROVIDER) console.log("Add PIXABAY_API_KEY or UNSPLASH_ACCESS_KEY to .env and run `pnpm seed:reset` for real photos.");
console.log(summary());
