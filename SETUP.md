# Setup checklist

1. **Sanity** – create a project/dataset; set `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_TOKEN` (Editor), `SANITY_API_READ_TOKEN` (Viewer). Add your site URL to the project's CORS origins.
2. **Clerk** – create an application; set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
3. **Admin** – set `NEXT_PUBLIC_ADMIN_EMAIL` to the owner's sign-in email (comma-separated for several).
4. **Stripe** – `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (webhook endpoint `/api/webhook`, event `checkout.session.completed`).
5. **Email (Gmail OAuth2)** – see `.env.example` for the client id/secret/refresh token variables.
6. **Branding** – fill the `NEXT_PUBLIC_STORE_*`, contact, colour and currency variables; replace `public/logo.png`, `app/icon.png`, `app/favicon.ico`.
7. **Demo data (optional)** – add `PIXABAY_API_KEY` (and/or `UNSPLASH_ACCESS_KEY`) then run `pnpm seed:dry` followed by `pnpm seed`. Replace demo products with real ones from `/admin/products`.
8. `pnpm dev` or deploy to Vercel (add every variable there, for Production *and* Preview, then redeploy).
