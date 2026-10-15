# Marketplace + Hero + Navigation — change report

Scope: exactly three changes. Backends, database, SMTP/email, Docker, `.env*`, `package.json`, lockfile,
`next.config.mjs`, `tsconfig.json` and `middleware.ts` are byte-for-byte unchanged.

## Change 1 — Fly to Europe hero centred
Files: `frontend/components/career/sections/Hero.tsx`, `frontend/app/career/career.css`
- Content block is now a centred column (title, route line, description, buttons). Background image, video and the
  dark overlay are untouched; buttons keep their destinations (`/career/apply`, `#programme`).
- The route line used the class `route`, but the stylesheet defines `career-route`, so the "Work • Fly • Earn •
  Settle in Europe" styling never applied. It now uses `career-route career-route-center`.
- Narrow screens keep the vertical route (dots stay in one column) and centre the block.

## Change 2 — Navigation
Files: `frontend/components/homepage/navbar/default.tsx`, `frontend/app/globals.css` (one `scroll-padding-top` rule)
- Existing destinations were already correct and are kept: Solutions `/#solutions`, Technology `/#pipeline`,
  Platforms `/platforms`, Marketplace `/marketplace`, Careers `/career`, Applications `/applications`, Login (unchanged flow).
- Fixed: mobile menu did not close after tapping a link; Login/menu buttons showed an arrow cursor; no current-page
  indicator (now `aria-current` + subtle highlight); in-page anchors hid under the fixed header.
- Internal links now use `next/link`. Existing hover and keyboard focus styles are kept.
- There is no separate "Solutions" or "Technology" page in this project: they are homepage sections. None was invented.

## Change 3 — Marketplace
Routes (all inside the main site, wrapped by the existing Navbar and Footer, no second header/footer):
`/marketplace`, `/marketplace/[productId]`, `/marketplace/cart`, `/marketplace/checkout`,
`/marketplace/orders`, `/marketplace/orders/[orderId]`, `/marketplace/orders/[orderId]/success`.
- New: `frontend/app/marketplace/layout.tsx` and route files; `frontend/app/marketplace/page.tsx` replaced.
- New: `frontend/components/marketplace/shop/**` (ported ZIP source: screens, UI, store, services, types, CSS).
- The old "coming soon" files in `components/marketplace/` are left on disk, now unused.
- Not copied: the ZIP's root layout, standalone header, bottom tab bar, `/host/[tab]` placeholders, its package.json /
  tsconfig / next config. The ZIP is Next 14 / React 18; the site is Next 16 / React 19, so the source was ported, not merged.
- CSS is scoped under `.mp` (keyframes prefixed `mp-`) so no other page is affected.
- The marketplace bar (delivery location, cart, order history) sits under the site header. One CartProvider.

### Services: ALL SIX ARE STILL MOCK DATA
The existing Hawk backends (contact, career, distributor) expose no product, cart, order, location, payment or
support endpoints, so none were invented. `services/index.ts` lists every service in `SERVICE_MODES` (all `'mock'`).
While any entry is mock, `IS_DEMO` is true and the UI says so:

| Service | State | What the user sees |
|---|---|---|
| products / categories / promotions | mock (7 sample products) | "Demo storefront" banner; "Redeem" says no discount is applied |
| cart | mock (browser localStorage, product ids + qty only) | works; no card data stored |
| orders | mock (browser localStorage) | "Place Demo Order" -> "Demo Order Created"; no ETA/tracking claims |
| payment | mock | NOT called in demo mode; no fake successful payment |
| location | mock (sample addresses) | works with sample addresses |
| support | mock | modal says support is not connected; links to `/contact` and the real company email |

To go live: implement the interfaces in `services/contracts.ts` against real endpoints, then set that entry to `'live'`.
Checkout should also require the existing booking login before real orders are accepted.

## Verified
`tsc --noEmit` clean; `next build` succeeds; ESLint on touched/new files: 0 errors (5 warnings);
all 16 key routes return 200 on `next start`; a headless-browser run confirmed: every header link, mobile menu closing,
Login opens `/login`, single header, product list / search / category, add to cart, product page, cart (survives refresh),
checkout, demo order success, order history, honest support modal, no page errors.

## NOT verified
Docker Compose and the three Java backends were not started; email/DB paths were not exercised (those files are unchanged).
The two reference screenshots were not in the upload, so centring was done from the written description.
