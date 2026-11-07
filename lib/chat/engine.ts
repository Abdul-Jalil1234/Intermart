import { backendClient } from "@/sanity/lib/backendClient";
import { formatCurrency } from "@/lib/currency";
import { siteConfig } from "@/config/site";

/**
 * FastBot — a fast, deterministic store assistant.
 *
 * It understands a fixed set of intents (order lookup, product search / availability,
 * deals, categories, policies, admin summaries), answers from live Sanity data and never
 * needs an external AI service. Everything it reveals is scoped to the caller:
 *   - guests: public catalogue + policies only
 *   - signed-in customers: additionally their OWN orders
 *   - admins: any order, store stats, low-stock report
 */

export type ChatRole = "guest" | "customer" | "admin";

export interface ChatContext {
  role: ChatRole;
  clerkUserId: string | null;
}

export interface ChatLink {
  label: string;
  href: string;
}

export interface BotReply {
  text: string;
  links?: ChatLink[];
  suggestions?: string[];
}

const money = (n: number | null | undefined) => formatCurrency(n ?? 0);

const STOP_WORDS = new Set([
  "a","an","the","is","are","do","does","you","have","has","any","in","on","of","for","to","me",
  "my","i","we","can","could","would","please","show","find","search","looking","look","want",
  "need","get","buy","stock","available","availability","price","how","much","cost","what",
  "whats","which","with","and","or","there","it","about","tell","check","product","products",
  "item","items","some","got","sell","selling","under","below","less","than","cheap","cheapest",
]);

const STATUS_TEXT: Record<string, string> = {
  pending: "received and waiting to be processed",
  address_confirmed: "address confirmed, awaiting order confirmation",
  order_confirmed: "confirmed and being prepared",
  packed: "packed and waiting for dispatch",
  ready_for_delivery: "ready for delivery",
  out_for_delivery: "out for delivery",
  delivered: "delivered",
  completed: "completed",
  cancelled: "cancelled",
  rescheduled: "rescheduled for a new delivery date",
  failed_delivery: "a delivery attempt failed — we will retry",
};

const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function extractOrderNumber(message: string): string | null {
  // Order numbers can contain letters, digits and dashes; require at least 5 characters
  // and one digit so ordinary words are not mistaken for one.
  const labelled = message.match(/(?:order|#|no\.?|number)\s*[:#]?\s*([A-Za-z0-9-]{5,})/i);
  if (labelled && /\d/.test(labelled[1])) return labelled[1];
  const bare = message.match(/\b([A-Za-z]{0,6}-?\d{5,}[A-Za-z0-9-]*)\b/);
  return bare ? bare[1] : null;
}

function extractBudget(message: string): number | null {
  const m = message.match(/(?:under|below|less than|max(?:imum)?|up to|<)\s*\$?\s*(\d+(?:\.\d+)?)/i);
  return m ? Number(m[1]) : null;
}

function keywords(message: string): string[] {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

// ---------------------------------------------------------------- data access

interface OrderRow {
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  totalPrice: number;
  orderDate: string;
  customerName?: string;
  email?: string;
  assignedDeliverymanName?: string;
  deliveredAt?: string;
  rescheduledDate?: string;
  items: { name: string; quantity: number }[];
}

const ORDER_PROJECTION = `{
  orderNumber, status, paymentStatus, paymentMethod, totalPrice, orderDate,
  customerName, email, assignedDeliverymanName, deliveredAt, rescheduledDate,
  "items": products[]{ "name": product->name, quantity }
}`;

function describeOrder(o: OrderRow, showCustomer: boolean): string {
  const lines = [
    `**Order ${o.orderNumber}** — ${titleCase(o.status)}`,
    `That means it is ${STATUS_TEXT[o.status] ?? o.status}.`,
    `Placed ${new Date(o.orderDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · Total ${money(o.totalPrice)}` +
      (o.paymentStatus ? ` · Payment: ${titleCase(o.paymentStatus)}` : "") +
      (o.paymentMethod ? ` (${titleCase(o.paymentMethod)})` : ""),
  ];
  if (showCustomer && (o.customerName || o.email)) {
    lines.push(`Customer: ${[o.customerName, o.email].filter(Boolean).join(" · ")}`);
  }
  const items = (o.items ?? []).filter((i) => i.name);
  if (items.length) {
    lines.push("Items: " + items.map((i) => `${i.quantity}× ${i.name}`).join(", "));
  }
  if (o.status === "out_for_delivery" && o.assignedDeliverymanName) {
    lines.push(`Delivery person: ${o.assignedDeliverymanName}`);
  }
  if (o.status === "rescheduled" && o.rescheduledDate) {
    lines.push(`New delivery date: ${new Date(o.rescheduledDate).toLocaleDateString("en-US")}`);
  }
  return lines.join("\n");
}

async function lookupOrder(orderNumber: string, ctx: ChatContext): Promise<BotReply> {
  if (ctx.role === "guest") {
    return {
      text: "Please sign in so I can look up your orders securely.",
      links: [{ label: "Sign in", href: "/sign-in" }],
    };
  }
  const order = await backendClient.fetch<OrderRow | null>(
    `*[_type == "order" && orderNumber == $n && ($admin || clerkUserId == $uid)][0]${ORDER_PROJECTION}`,
    { n: orderNumber, admin: ctx.role === "admin", uid: ctx.clerkUserId }
  );
  if (!order) {
    return {
      text: `I couldn't find order "${orderNumber}"${ctx.role === "admin" ? "" : " on your account"}. Please double-check the number.`,
      links: [{ label: "My orders", href: "/orders" }],
    };
  }
  return {
    text: describeOrder(order, ctx.role === "admin"),
    links: [{ label: "View all orders", href: ctx.role === "admin" ? "/admin/orders" : "/orders" }],
  };
}

async function recentOrders(ctx: ChatContext): Promise<BotReply> {
  if (ctx.role === "guest") {
    return {
      text: "Please sign in so I can show your orders.",
      links: [{ label: "Sign in", href: "/sign-in" }],
    };
  }
  const rows = await backendClient.fetch<OrderRow[]>(
    `*[_type == "order" && ($admin || clerkUserId == $uid)] | order(orderDate desc)[0...5]${ORDER_PROJECTION}`,
    { admin: ctx.role === "admin", uid: ctx.clerkUserId }
  );
  if (!rows.length) {
    return { text: "There are no orders yet.", links: [{ label: "Browse the shop", href: "/shop" }] };
  }
  return {
    text:
      (ctx.role === "admin" ? "Latest 5 orders in the store:\n" : "Your latest orders:\n") +
      rows
        .map(
          (o) =>
            `• ${o.orderNumber} — ${titleCase(o.status)} — ${money(o.totalPrice)}` +
            (ctx.role === "admin" && o.customerName ? ` — ${o.customerName}` : "")
        )
        .join("\n") +
      "\n\nAsk me about any of them, e.g. “where is order " +
      rows[0].orderNumber +
      "?”",
    links: [{ label: "All orders", href: ctx.role === "admin" ? "/admin/orders" : "/orders" }],
  };
}

interface ProductRow {
  name: string;
  slug: string;
  price: number;
  discount?: number;
  stock: number;
  status?: string;
  category?: string;
}

const finalPrice = (p: ProductRow) =>
  p.discount ? p.price * (1 - p.discount / 100) : p.price;

const stockText = (stock: number) =>
  stock <= 0 ? "out of stock" : stock <= 5 ? `only ${stock} left` : "in stock";

async function searchProducts(message: string): Promise<BotReply> {
  const words = keywords(message);
  const budget = extractBudget(message);

  if (!words.length && budget === null) {
    return {
      text: "What are you looking for? Tell me a product name, a category (phones, TVs, fridges…) or a budget.",
      suggestions: ["Show hot deals", "What categories do you have?", "Phones under $300"],
    };
  }

  const params: Record<string, string | number> = {};
  const clauses = words.map((w, i) => {
    params[`w${i}`] = `${w}*`;
    return `name match $w${i} || description match $w${i} || categories[]->title match $w${i} || brand->title match $w${i}`;
  });
  const textFilter = clauses.length ? ` && (${clauses.map((c) => `(${c})`).join(" || ")})` : "";
  const budgetFilter = budget !== null ? ` && price * (1 - coalesce(discount, 0) / 100) <= $budget` : "";
  if (budget !== null) params.budget = budget;

  const rows = await backendClient.fetch<ProductRow[]>(
    `*[_type == "product"${textFilter}${budgetFilter}] | order(stock > 0 desc, price asc)[0...6]{
      name, "slug": slug.current, price, discount, stock, status, "category": categories[0]->title
    }`,
    params
  );

  if (!rows.length) {
    return {
      text: `I couldn't find anything matching “${words.join(" ") || "that"}”${budget !== null ? ` under ${money(budget)}` : ""}. Try a broader word, or browse the categories.`,
      links: [{ label: "Browse the shop", href: "/shop" }],
      suggestions: ["What categories do you have?", "Show hot deals"],
    };
  }

  return {
    text:
      `Here's what I found:\n` +
      rows
        .map(
          (p) =>
            `• **${p.name}** — ${money(finalPrice(p))}` +
            (p.discount ? ` (${p.discount}% off)` : "") +
            ` — ${stockText(p.stock)}`
        )
        .join("\n"),
    links: rows.map((p) => ({ label: p.name, href: `/product/${p.slug}` })),
  };
}

async function deals(): Promise<BotReply> {
  const rows = await backendClient.fetch<ProductRow[]>(
    `*[_type == "product" && stock > 0 && (status == "hot" || status == "sale" || discount > 0)] | order(discount desc)[0...6]{
      name, "slug": slug.current, price, discount, stock, status
    }`
  );
  if (!rows.length) return { text: "No special deals right now — check back soon!", links: [{ label: "Browse the shop", href: "/shop" }] };
  return {
    text:
      "Current deals:\n" +
      rows
        .map((p) => `• **${p.name}** — ${money(finalPrice(p))}${p.discount ? ` (${p.discount}% off, was ${money(p.price)})` : ""}`)
        .join("\n"),
    links: [...rows.map((p) => ({ label: p.name, href: `/product/${p.slug}` })), { label: "All deals", href: "/deal" }],
  };
}

async function categories(): Promise<BotReply> {
  const rows = await backendClient.fetch<{ title: string; slug: string; count: number }[]>(
    `*[_type == "category"] | order(title asc){ title, "slug": slug.current, "count": count(*[_type == "product" && references(^._id)]) }`
  );
  if (!rows.length) return { text: "There are no categories yet." };
  return {
    text: "We carry:\n" + rows.map((c) => `• ${c.title} (${c.count} product${c.count === 1 ? "" : "s"})`).join("\n"),
    links: rows.slice(0, 8).map((c) => ({ label: c.title, href: `/category/${c.slug}` })),
  };
}

async function adminSummary(): Promise<BotReply> {
  const s = await backendClient.fetch<{
    orders: number; pending: number; revenue: number; products: number; outOfStock: number;
    low: { name: string; stock: number }[];
  }>(`{
    "orders": count(*[_type == "order"]),
    "pending": count(*[_type == "order" && status == "pending"]),
    "revenue": math::sum(*[_type == "order" && paymentStatus == "paid"].totalPrice),
    "products": count(*[_type == "product"]),
    "outOfStock": count(*[_type == "product" && stock <= 0]),
    "low": *[_type == "product" && stock > 0 && stock <= 5] | order(stock asc)[0...8]{ name, stock }
  }`);
  return {
    text:
      `Store summary:\n• Orders: ${s.orders} (${s.pending} pending)\n• Paid revenue: ${money(s.revenue)}\n• Products: ${s.products} (${s.outOfStock} out of stock)` +
      (s.low.length ? `\n\nLow stock:\n` + s.low.map((p) => `• ${p.name} — ${p.stock} left`).join("\n") : ""),
    links: [
      { label: "Analytics", href: "/admin/analytics" },
      { label: "Manage products", href: "/admin/products" },
    ],
  };
}

async function stockReport(): Promise<BotReply> {
  const rows = await backendClient.fetch<{ name: string; stock: number }[]>(
    `*[_type == "product" && stock <= 5] | order(stock asc)[0...15]{ name, stock }`
  );
  if (!rows.length) return { text: "All products are well stocked (more than 5 units each)." };
  return {
    text: "Products that are out or low on stock:\n" + rows.map((p) => `• ${p.name} — ${p.stock <= 0 ? "OUT" : p.stock + " left"}`).join("\n"),
    links: [{ label: "Manage products", href: "/admin/products" }],
  };
}

// ---------------------------------------------------------------- intents

const has = (m: string, re: RegExp) => re.test(m);

export async function answer(rawMessage: string, ctx: ChatContext): Promise<BotReply> {
  const message = rawMessage.trim().slice(0, 500);
  const m = message.toLowerCase();

  if (!m) return { text: "Type a question and I'll help." };

  if (has(m, /^(hi|hello|hey|good (morning|afternoon|evening)|yo)\b/)) {
    return {
      text:
        ctx.role === "admin"
          ? "Hi boss 👋 I can pull order details, a store summary, or low-stock alerts."
          : "Hi there 👋 I'm FastBot. I can track your orders, check product availability and answer shipping or returns questions.",
      suggestions: defaultSuggestions(ctx),
    };
  }

  if (has(m, /\b(thanks|thank you|thx)\b/)) return { text: "You're welcome! Anything else?" };

  // Admin-only reports
  if (has(m, /\b(summary|overview|stats|statistics|revenue|sales today|how are we doing)\b/)) {
    if (ctx.role !== "admin") return { text: "Store statistics are only available to the store admin." };
    return adminSummary();
  }
  if (has(m, /\b(low stock|out of stock|running low|restock|inventory)\b/) && ctx.role === "admin") {
    return stockReport();
  }

  // Orders
  const orderNumber = extractOrderNumber(message);
  const mentionsOrder = has(m, /\b(order|track|tracking|delivery|deliver|shipment|parcel|package|where is)\b/);
  if (orderNumber && (mentionsOrder || /^[A-Za-z0-9-]{5,}$/.test(message))) {
    return lookupOrder(orderNumber, ctx);
  }
  if (mentionsOrder && has(m, /\b(my|latest|recent|last|all|pending|orders)\b/)) {
    return recentOrders(ctx);
  }

  // Policies
  if (has(m, /\b(return|refund|exchange|money back)\b/)) {
    return {
      text: "Returns & refunds: you can request a refund on an eligible order from your orders page. Approved refunds are returned to your wallet or original payment method. Items should be unused and in their original packaging.",
      links: [{ label: "My orders", href: "/orders" }, { label: "FAQ", href: "/faq" }],
    };
  }
  if (has(m, /\b(shipping|delivery time|how long|delivery cost|ship to)\b/)) {
    return {
      text: "Orders are confirmed, packed and dispatched in stages — you can follow every stage on your order page. Shipping cost is shown at checkout before you pay.",
      links: [{ label: "FAQ", href: "/faq" }, { label: "My orders", href: "/orders" }],
    };
  }
  if (has(m, /\b(pay|payment|card|cash on delivery|cod|stripe)\b/) && !mentionsOrder) {
    return {
      text: "We accept card payments (via Stripe), wallet / Clerk payments and cash on delivery on eligible orders.",
      links: [{ label: "FAQ", href: "/faq" }],
    };
  }
  if (has(m, /\b(contact|support|human|agent|phone|email us|speak to)\b/)) {
    return {
      text: "You can reach our team through the contact page — we reply as soon as possible.",
      links: [{ label: "Contact us", href: "/contact" }],
    };
  }

  // Catalogue
  if (has(m, /\b(deal|deals|offer|offers|discount|sale|hot|promo)\b/) && !has(m, /\bunder|below\b/)) return deals();
  if (has(m, /\b(categories|category|what do you sell|what do you have|departments)\b/)) return categories();

  // Anything else: treat as a product search.
  return searchProducts(message);
}

export function defaultSuggestions(ctx: ChatContext): string[] {
  if (ctx.role === "admin") return ["Store summary", "Low stock", "Latest orders"];
  if (ctx.role === "customer") return ["Where is my order?", "Show hot deals", "Is the Hi-Tech Tab in stock?"];
  return ["Show hot deals", "What categories do you have?", "Return policy"];
}
