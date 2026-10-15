# Hawk Aerospace — Navigation Back-Path + Role-Based Access

Two changes only, as specified. Nothing else in the project was touched —
confirmed by diffing against the previously delivered archive: exactly 15
files changed, listed below.

## 1. SkyMap → Platforms → Hawk Aerospace navigation

SkyMap already had a small "Hawk Aerospace" text link in three places (its
own site header, its buyer-dashboard sidebar, its owner-dashboard sidebar) —
each one pointed straight at `/`. All three now point at `/platforms`
instead, with the label changed to "← Back to Platforms":

- `components/skymap/skymap-site.tsx` — desktop header link retargeted; the
  same link added to the mobile menu panel (which had no back-link at all
  before)
- `components/skymap/dashboard/dashboard-shell.tsx` — sidebar link retargeted
- `app/platforms/skymap/owner/layout.tsx` — sidebar link retargeted

No SkyMap component was restructured — same element, same position, same
classes, only `href` and text content changed.

The `/platforms` page itself got one small addition: an explicit
"← Back to Hawk Aerospace" link at the top of its hero, going to `/`.

Flow is now: **Hawk Home → Platforms → SkyMap (new tab) → Back to Platforms
→ Back to Hawk Aerospace.** SkyMap still opens in a new tab — unchanged
(`components/homepage/platforms/platform-cards.tsx` was not touched).
Browser back still works normally everywhere; this is purely an added
in-product path, not a replacement for it.

## 2. Role-based workspace access

**Role model** (`lib/booking/types.ts`): `BookingRole` extended from
`"customer" | "pilot" | "admin"` to include `"sales"`.

**Demo accounts** (`lib/booking/demo-accounts.ts`): added a fourth demo
phone, `+91 98765 43213` (OTP `123456`), mapped to `sales`. Also added
`workspaceRouteForRole()` — the single source of truth for "which route does
this role own," used everywhere below instead of any hardcoded page.

**Enforced at render, not just hidden buttons** (§14 of the brief):

- `components/workspace/workspace-shell.tsx` — added a `requiredRole` prop.
  If the signed-in user's role doesn't match, the workspace's content is
  never rendered; an Access Denied screen shows instead, with a button to
  the user's *own* workspace (via `workspaceRouteForRole`), never a
  dashboard peek.
- `app/my-bookings/page.tsx` → `requiredRole="customer"`
- `app/workspaces/sales/page.tsx` → `requiredRole="sales"`
- `app/pilot/page.tsx` / `app/admin/page.tsx` already had this exact
  role-gate pattern from before this task (checked `user.role`, rendered an
  Access Denied block, never just hid a button). The only fix here: their
  Access Denied button used to hardcode a link to `/my-bookings`. It now
  routes to the caller's actual own workspace via the same helper, so a
  Fleet Manager who opens `/pilot` lands on `/admin`, not on a Customer page.

**9-dot launcher and mobile nav are role-aware**
(`components/homepage/workspace-launcher.tsx`,
`components/homepage/navbar/default.tsx`): each `Workspace` entry in
`lib/data/hawk.ts` now carries a `role` field, and both the desktop launcher
and the mobile menu filter the list down to only the signed-in user's own
role. A Pilot never sees Customer/Fleet Manager/Sales as options — not
grayed out, not "Coming soon," simply not in the list.

**Login** (`app/login/page.tsx`): the default post-login landing now uses
the same `workspaceRouteForRole()` helper, so the new Sales demo account
lands on `/workspaces/sales` like everyone else lands on their own
workspace.

## An honest limitation, not glossed over

This app's Hawk-side auth (as documented in the existing code —
`demo-accounts.ts`, `auth-context.tsx`) is **client-side only**: a phone
number + OTP flow backed by `localStorage`, with no server session or
cookie. SkyMap has its own separate, real cookie-based session and its own
`middleware.ts` — that architecture was left untouched, per the brief.

For the Hawk side, "verify role, not just hide a button" was implemented the
only way this existing architecture supports: each protected route renders
its Access Denied state itself, so unauthorized dashboard content is never
mounted — but there's no middleware-level check, because there's no server
session for it to check against. Building one would mean adding new backend
session/auth infrastructure, which the brief explicitly asked me not to do
("do not duplicate authentication logic," "reuse the existing... if the
current backend already supports roles"). If a real server session gets
added later, the same `workspaceRouteForRole()` + per-route gate pattern
extends cleanly to a `middleware.ts` check — the mapping already exists in
one place for exactly that purpose.

## Files changed (15)

```
app/admin/page.tsx
app/login/page.tsx
app/my-bookings/page.tsx
app/pilot/page.tsx
app/platforms/page.tsx
app/platforms/skymap/owner/layout.tsx
app/workspaces/sales/page.tsx
components/homepage/navbar/default.tsx
components/homepage/workspace-launcher.tsx
components/skymap/dashboard/dashboard-shell.tsx
components/skymap/skymap-site.tsx
components/workspace/workspace-shell.tsx
lib/booking/demo-accounts.ts
lib/booking/types.ts
lib/data/hawk.ts
```

Homepage, Customer Dashboard content/layout/data, Live Tracking, Book a
Raider, Choose Service, Raider System, maps, service icons, the approved
green theme, Marketplace, APIs and business logic are all byte-identical to
the previous delivery.

## Not validated here

No network access, so `npm install`/`next build` did not run. `tsc` parses
every file cleanly. Please run all five test flows from the brief locally:
SkyMap↔Platforms↔Home navigation, and each of the four role logins
confirming they land on, and are confined to, their own workspace.
