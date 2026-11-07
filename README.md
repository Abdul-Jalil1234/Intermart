# Intermart Store

A full-featured, **white-label** e-commerce storefront (Next.js 16, Clerk, Sanity, Stripe).
Ships configured for **Intermart** (red & black, "Partenaire Intermarché") and can be re-branded
for any other shop by editing environment variables only — no code changes.

## Features
- Storefront: categories, brands, search, filters, wishlist, cart, checkout (Cash on delivery / Stripe), reviews, blog, spin & win, reward points
- Customer area: orders, addresses, notifications bell, profile
- Admin dashboard: real analytics, orders, users, reviews, notifications, **product add / edit / delete with image upload straight into Sanity**
- **FastBot** chat widget: order lookup, product availability, shipping & store info
- **Real-time-feeling notifications & emails** (see below)
- Server-side price/shipping/tax calculation, admin-guarded API routes, security headers

## Quick start
```bash
pnpm install
cp .env.example .env.local      # fill it in (see SETUP.md)
pnpm seed                        # optional: demo supermarket catalogue with real photos
pnpm dev                         # http://localhost:3000
```

## Switching to another store
Everything brand-specific lives in `.env.example` → copy it to `.env.local` (and to Vercel env vars):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_COMPANY_NAME`, `_BRANCH`, `_TAGLINE`, `_DESCRIPTION` | Name shown everywhere (header, emails, SEO, FastBot) |
| `NEXT_PUBLIC_COMPANY_LOGO` (+ `_WIDTH` / `_HEIGHT`) | Put the new logo in `public/` and point to it |
| `NEXT_PUBLIC_COMPANY_EMAIL`, `_PHONE`, `_ADDRESS`, `_CITY`, `_BUSINESS_HOURS_*`, `NEXT_PUBLIC_SUPPORT_EMAIL`, social URLs | Contact page, footer, FAQ, emails |
| `NEXT_PUBLIC_BRAND_PRIMARY`, `_PRIMARY_HOVER`, `_DARK`, `_DARK_HOVER`, `_ACCENT`, `_TINT`, `_PRIMARY_SOFT` | Brand colours |
| `NEXT_PUBLIC_CURRENCY_CODE`, `NEXT_PUBLIC_LOCALE` | Currency formatting & Stripe currency |
| `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD`, `NEXT_PUBLIC_SHIPPING_FEE`, `TAX_AMOUNT`, `NEXT_PUBLIC_PRICE_BREAKPOINTS` | Delivery, tax and price-filter rules |

Also replace `public/logo.png`, `app/icon.png` and `app/favicon.ico` with the new brand's images.
Seed script company data is driven by the same variables.

## Real-time notifications and emails
- **Emails** are sent immediately: right after an order is placed (confirmation) and whenever a notification is created or an order status changes (via `after()` so the customer's response is never delayed).
- **In-app notifications**: the bell polls a tiny endpoint (`/api/user/notifications/unread-count`) every `NEXT_PUBLIC_NOTIFICATION_POLL_SECONDS` seconds (default 15, paused when the tab is hidden) and shows a toast when something new arrives.
- Serverless hosting (Vercel) can't hold WebSocket connections. For true instant push, plug in Pusher, Ably or Firebase Cloud Messaging and trigger it from `lib/notificationService.ts`.

## Security notes
- Prices, shipping and tax are recomputed on the server from Sanity; the browser's totals are ignored.
- All `/api/admin/*` routes require an admin (`NEXT_PUBLIC_ADMIN_EMAIL`).
- Stripe webhook verifies signatures; set `STRIPE_WEBHOOK_SECRET`.
- The "Clerk payment" method is a placeholder with no processor: only admins can mark such orders paid.
- Add rate limiting (e.g. Upstash) to `/api/chat`, `/api/contact`, `/api/newsletter` before heavy traffic.

## Deploy
Push to GitHub, import in Vercel, add the env vars from `.env.example`, set `NEXT_PUBLIC_BASE_URL` to your domain and register the Stripe webhook at `/api/webhook`.

More guides are in `docs/`.
