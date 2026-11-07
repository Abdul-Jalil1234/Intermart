/**
 * Single source of truth for everything that identifies the store.
 *
 * To rebrand for another store, change the NEXT_PUBLIC_* values in `.env`
 * (see `.env.example`) and replace the logo file. No code changes are needed.
 */

const env = (value: string | undefined, fallback: string): string =>
  value && value.trim() ? value.trim() : fallback;

const name = env(process.env.NEXT_PUBLIC_COMPANY_NAME, "Intermart");
const branch = env(process.env.NEXT_PUBLIC_COMPANY_BRANCH, "Mahogany");

/** "Intermart Mahogany" - or just "Intermart" when the branch is blank. */
const displayName = branch ? `${name} ${branch}` : name;

const tagline = env(
  process.env.NEXT_PUBLIC_COMPANY_TAGLINE,
  "Fresh groceries and everyday essentials, delivered to your door"
);

const baseUrl = env(
  process.env.NEXT_PUBLIC_BASE_URL,
  "http://localhost:3000"
).replace(/\/+$/, "");

export const siteConfig = {
  name,
  branch,
  displayName,
  tagline,
  description: env(
    process.env.NEXT_PUBLIC_COMPANY_DESCRIPTION,
    `Shop online at ${displayName}: fresh produce, groceries, household essentials and more at great prices, with fast delivery.`
  ),
  url: baseUrl,

  logo: {
    /** Path under /public, or a full https:// URL. */
    src: env(process.env.NEXT_PUBLIC_COMPANY_LOGO, "/logo.png"),
    alt: `${displayName} logo`,
    width: Number(env(process.env.NEXT_PUBLIC_COMPANY_LOGO_WIDTH, "738")),
    height: Number(env(process.env.NEXT_PUBLIC_COMPANY_LOGO_HEIGHT, "270")),
  },

  /** Brand colours. Applied as CSS variables in app/layout.tsx. */
  colors: {
    primary: env(process.env.NEXT_PUBLIC_BRAND_PRIMARY, "#e00024"),
    primaryHover: env(process.env.NEXT_PUBLIC_BRAND_PRIMARY_HOVER, "#b8001d"),
    dark: env(process.env.NEXT_PUBLIC_BRAND_DARK, "#111111"),
    darkHover: env(process.env.NEXT_PUBLIC_BRAND_DARK_HOVER, "#2b2b2b"),
    accent: env(process.env.NEXT_PUBLIC_BRAND_ACCENT, "#ff5a36"),
    /** Very light tint used for soft page/section backgrounds. */
    tint: env(process.env.NEXT_PUBLIC_BRAND_TINT, "#fdeced"),
    /** Soft tint of the primary colour used for hover and highlight areas. */
    primarySoft: env(process.env.NEXT_PUBLIC_BRAND_PRIMARY_SOFT, "#f6a5ab"),
  },

  currency: {
    /** ISO 4217 code, e.g. USD, MUR, EUR. Must be supported by Stripe. */
    code: env(process.env.NEXT_PUBLIC_CURRENCY_CODE, "USD").toUpperCase(),
    /** BCP 47 locale used to format prices, e.g. en-US, en-MU, fr-FR. */
    locale: env(process.env.NEXT_PUBLIC_LOCALE, "en-US"),
  },

  shipping: {
    /** Orders above this subtotal ship free. */
    freeThreshold: Number(env(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD, "100")),
    /** Flat delivery fee for orders at or below the threshold. */
    fee: Number(env(process.env.NEXT_PUBLIC_SHIPPING_FEE, "10")),
  },

  /** Upper bounds for the shop page price filter, ascending. */
  priceBreakpoints: env(process.env.NEXT_PUBLIC_PRICE_BREAKPOINTS, "100,200,300,500")
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b),

  realtime: {
    /** How often (seconds) the header bell checks for new notifications. 0 disables polling. */
    notificationPollSeconds: Number(
      env(process.env.NEXT_PUBLIC_NOTIFICATION_POLL_SECONDS, "15")
    ),
  },

  email: {
    /** The "from" display name used for outgoing mail. */
    senderName: env(process.env.NEXT_PUBLIC_EMAIL_SENDER_NAME, displayName),
    senderAddress: env(
      process.env.SENDER_EMAIL_ADDRESS,
      env(process.env.NEXT_PUBLIC_COMPANY_EMAIL, "support@example.com")
    ),
  },
} as const;

export type SiteConfig = typeof siteConfig;
