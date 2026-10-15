# Branding cleanup, dashboard removal and Contact Us integration

## 1. Branding (shared header and footer only)
- Added `public/images/hawk-icon.png`: the supplied company icon, cropped, with only the dark backdrop made transparent (symbol untouched, same grey).
- `components/homepage/navbar/default.tsx`: desktop logo and mobile-menu logo are now the icon only (diamond SVG and "Hawk Aerospace" text removed; the alt text keeps the accessible name). Height h-10 inside the unchanged h-16 / sm:h-18 bar.
- `components/homepage/footer/default.tsx`: diamond + "Hawk Aerospace" heading replaced by the icon. All other footer content untouched.
- Every page using the shared Navbar/Footer picks this up (home, career, distributor, applications, contact, platforms, about, marketplace, admin ...).
- NOT changed (not the shared header/footer; say if you want them changed): the diamond + text still appears on /login and /register (card logo), the customer workspace sidebar (components/workspace/workspace-shell.tsx), the workspace sign-in gate (components/dashboards/shared/dashboard-auth-gate.tsx) and the Distributor intro panel. SkyMap uses its own logo and was not touched.

## 2. Dashboards removed
- Routes deleted: app/pilot, app/dashboard (fleet-manager, technician), app/workspaces (sales): 18 files.
- Components deleted: components/dashboards/{pilot,fleet-manager,technician,sales-aggregator}: 163 files. components/dashboards/shared is kept (used by the customer workspace).
- scripts/build-dashboard-css.mjs and the "build:dashboard-css" npm script deleted (they only served the removed dashboards).
- lib/data/hawk.ts: the four entries removed from `workspaces` (the 9-dot launcher and mobile menu now list Customer only) and the Pilot / Fleet Manager / Sales Aggregator links removed from the footer "Workspace" column.
- lib/workspaces.ts: WorkspaceKey narrowed to "customer". workspace-launcher.tsx: unused icons removed.
- lib/booking/demo-accounts.ts: the four removed roles now land on "/" after login instead of a deleted route (demo accounts and auth untouched).
- README.md: dashboard table rows removed.
- The /admin route is a separate page and was kept.

## 3. Contact Us (frontend only)
- Route: **/contact** (direct URL and the new "Contact Us" header link, last item before Login).
- Added: app/contact/page.tsx, components/contact/{contact-form,contact-info}.tsx, lib/contact/{api,validation,contact-options,details}.ts.
- Uses the shared Hawk header/footer; the standalone app's own navbar/footer/logo were not copied.
- **contact-info.tsx was a 0-byte file in the supplied zip**, so the page could not build as supplied. It was rebuilt from the Contact app README and config (email, phone, suppliers/vendors, job opportunities, using only the original contact details). Please review it.
- No backend: lib/contact/api.ts sends nothing while NEXT_PUBLIC_CONTACT_API_BASE_URL is empty and returns a "not connected yet" error with the email/phone, so the form never shows a fake success. The original request/response handling for POST {base}/api/v1/contact is kept for later. The old localhost:8080 default was removed on purpose.
- Form fields, labels, validation, honeypot and interactions are the original code (only import paths changed).

## 4. Header fit
The header now has 8 links. With the icon-only logo the estimated width is about 1146px of the 1248px available at the xl breakpoint (1280px). Estimate only; check visually.

## Files
Modified: components/homepage/navbar/default.tsx, components/homepage/footer/default.tsx, components/homepage/workspace-launcher.tsx, lib/data/hawk.ts, lib/workspaces.ts, lib/booking/demo-accounts.ts, package.json (one script removed), README.md, .env.example.
Added: public/images/hawk-icon.png, app/contact/page.tsx, components/contact/*, lib/contact/*, CHANGES-BRANDING-CONTACT.md.
Deleted: the dashboard route and component trees listed above, scripts/build-dashboard-css.mjs.
