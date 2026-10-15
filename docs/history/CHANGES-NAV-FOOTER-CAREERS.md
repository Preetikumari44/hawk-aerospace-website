# Header cleanup, footer top links and Careers `inert` fix

## Changes
1. `lib/data/hawk.ts` (the header is driven by `navLinks`, so every page updates)
   - Removed `Distributor / Dealer Application` and `Contact Us` from `navLinks`.
   - Header order is now: Solutions, Technology, Platforms, Marketplace, Careers, Applications.
   - `Applications` was KEPT: it links to `/applications`, the SkyMap / AgriSure launcher, a different feature from the
     distributor form, so it is not redundant.
   - Added `DISTRIBUTOR_APPLICATION_ROUTE`, `CONTACT_ROUTE` and `footerTopLinks`.
2. `components/homepage/footer/default.tsx` (shared footer)
   - Added a "Quick links" row at the very top: `Distributor Application`, then `Contact Us`. Same colours, fonts and
     spacing, with a divider under the row; wraps on mobile. Not repeated elsewhere in the footer.
3. `components/career/sections/Faq.tsx`
   - Cause: `inert: "" as unknown as undefined` was spread onto the answer div, so React 19 got an empty string for a
     boolean attribute. Replaced with `inert={!isOpen}`. No other invalid boolean attributes found.

## Footer link routes
- Distributor Application -> `/partners/distributor-application` (existing page and form)
- Contact Us -> `/contact` (existing page)

## Tests run
- `tsc --noEmit` clean; `npm run build` succeeds; ESLint 0 errors (3 pre-existing warnings).
- Production server, desktop 1440px and mobile 390px, 11 pages: no distributor/contact link in the header, one footer
  per page with the two links in order at the top. Both links clicked and land on the right pages.
- /career: no `inert` warning, no console errors or warnings. FAQ open/close/multi-open and `#faq-qN` deep links work.

## Notes
- SkyMap (`/platforms/skymap/*`) has its own navbar/footer and was left untouched.
- Existing footer "Contact" links (`/#contact`) were left as they were; say if you want them pointed at `/contact`.
