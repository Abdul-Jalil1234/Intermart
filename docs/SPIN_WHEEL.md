# Spin & Win wheel

**What visitors see:** on the home page a wheel opens by itself after ~2.5s (once a day).
On every other page a floating "Spin & Win" button (bottom-left) opens it. Each slice is a
product from your Sanity catalogue; the winner is added to the cart for free.

## How it works
| Piece | File |
|---|---|
| Wheel UI (SVG, animation, prize card) | `components/wheel/SpinWheel.tsx` |
| Auto-open + floating button, mounted in the storefront layout | `components/wheel/SpinWheelLauncher.tsx` |
| Builds today's wheel, picks the winner on the server | `actions/wheelActions.ts` |
| Signing, spin cookie, prize tokens | `lib/wheel.ts` |
| Free "prize" cart line (price 0, qty locked to 1) | `store.ts` (`addPrizeItem`) |
| Prize verified when an order is placed | `app/api/orders/route.ts` |

- **Server picks the winner** (`crypto.randomInt`) from the slices on screen, so the animation always lands on the real prize. The original Temu clone derived the winner from the date, so everyone won the same item.
- **One spin per day per browser** via a signed httpOnly cookie (`WHEEL_SECRET`).
- **Prize token**: signed, expires after 24h. At order time the API checks the signature, that there is only one prize at quantity 1, and records a `wheelRedemption` document in Sanity so a token can't be reused.
- Wheel slices exclude products already in the visitor's cart and anything above `WHEEL_MAX_PRIZE_PRICE`. Needs at least 3 eligible in-stock products, otherwise the wheel stays hidden.

## Limits to know about
- Clearing cookies gives a new spin. For strictly one spin per customer, also record spins against the Clerk user id in Sanity.
- The starter's checkout trusts prices and totals sent from the browser (`/api/orders`, `/api/checkout/*`). The prize check above covers the free item, but a determined user could still tamper with other prices. Recompute totals from Sanity on the server before going live.
