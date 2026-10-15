# Hawk Aerospace integration report

## Modified existing files (3)
- `lib/data/hawk.ts` - added Careers, Distributor / Dealer Application, Applications to `navLinks`.
- `components/homepage/navbar/default.tsx` - desktop breakpoint `lg:` -> `xl:` (7 links do not fit at 1024px). Visual check pending.
- `.env.example` - appended CAREER_BACKEND_URL, NEXT_PUBLIC_APPLICATION_ENDPOINT, AGRISURE_URL.
Deleted: none.

## Added
- Routes: `app/career/{layout,page}.tsx`, `app/career/career.css`, `app/career/apply/page.tsx`,
  `app/partners/distributor-application/page.tsx`, `app/applications/page.tsx`, `app/api/career/submit-interview/route.ts`
- Components: `components/career/**`, `components/distributor/**`, `components/applications/application-launcher.tsx`
- Libs: `lib/career/**`, `lib/distributor/**`
- Assets: `public/career/{images,video}`, `public/images/hawk-h-series-drone.webp`
- No dependency or package.json changes.

## Setup (PowerShell)
```powershell
npm ci
copy .env.example .env.local   # then fill values
npm run dev                    # http://localhost:3000
```
Java backend (`hawk-distributor-dealer-backend`): `docker compose up -d`, copy `.env.example` to `.env`, set values
(`CORS_ALLOWED_ORIGINS=http://localhost:3000`), load them into the shell, then `mvn spring-boot:run`.
Set `NEXT_PUBLIC_APPLICATION_ENDPOINT=http://localhost:8080/api/distributor/applications` and rebuild/restart Next.
Flyway creates the schema on startup.

## Test results (actually executed)
- Baseline (untouched): `next build` OK, `tsc` OK, eslint 118 errors / 15 warnings (pre-existing).
- Integrated: `next build` OK, `tsc` OK, new files eslint-clean. All baseline routes present; 3 new pages + applications + 1 API route.
- Source diff vs original: only the 3 files above changed; SkyMap, APIs, middleware untouched.
- Career: form field names identical to original; request via the Next proxy reached PHP and saved a row in a real
  MariaDB with the CV stored; repeat returned DUPLICATE; proxy returns 503 (unset) / 502 (unreachable). SMTP not tested.
- Distributor: multipart field names and option lists match the Java controller; success:false shows an error.
  Java build/tests/PostgreSQL NOT run (Maven Central unreachable in the sandbox).
- Applications: SkyMap link works; AgriSure shows unavailable state when AGRISURE_URL is unset and a link when set.

## Not verified / remaining
- Java Maven build, unit and DB integration tests, real PostgreSQL save, SMTP for both backends.
- Browser/responsive checks (desktop, tablet, mobile), including header width at 1280px.
- Production values: CAREER_BACKEND_URL, NEXT_PUBLIC_APPLICATION_ENDPOINT, AGRISURE_URL, Java CORS origin, rotated credentials.
