# Integration report

## Inventory (what was found)
| Project | Stack | API contract | Storage |
|---|---|---|---|
| Main site (`hawk-aerospace-integrated-contact.zip`) | Next 16 / React 19 | had: Careers proxy to a **PHP** `submit_interview.php` (no longer exists), Contact in "not connected" mode, Distributor posting from the browser to `NEXT_PUBLIC_APPLICATION_ENDPOINT` (preview when empty) | - |
| Contact (`contact-us-app.zip`) | Spring Boot 3.4, JSON | `POST /api/v1/contact` -> 201 `{success,message,referenceId}`; 400/422 `fieldErrors`; 409; 429 | MySQL `hawk_contact`, Flyway V1-V2, SMTP |
| Careers (`hawk-career-next.zip`) | Spring Boot 3.5 (**Java**, replaced PHP), multipart | `POST /api/applications` -> 201 `CREATED` / 409 `DUPLICATE` / 422 / 400 / 413 / 5xx `status` codes | MySQL `drone_applications` (existing table, no schema supplied) + outbox table; files on disk |
| Distributor (`hawk-distributor-application.zip`) | Spring Boot 3.4, multipart | `POST /api/distributor/applications` (`models[]`, `file`) -> 201/200 `{success,message,applicationId}`; 400 `errors[]`; 429 | MySQL `hawk_distributor`, Flyway V1; files on disk |

Discrepancies vs. the brief: Careers is Java not PHP; databases are MySQL not PostgreSQL; Careers backend ZIP lacked its `storage` package.
The standalone frontends of the three ZIPs were **not** copied (duplicate shells); their pages were already integrated in the main site.

## Changes (file by file, meaningful only)
| File | Change |
|---|---|
| `frontend/lib/server/backend-proxy.ts` (new) | shared server-side forwarder: env-configured backend, media-type/size checks, timeout, forwards visitor IP, relays only real JSON, uniform error body, logs without personal data |
| `frontend/app/api/contact/route.ts` (new) | -> `${CONTACT_API_URL}/api/v1/contact` |
| `frontend/app/api/career/applications/route.ts` (new); `app/api/career/submit-interview/route.ts` (deleted) | -> `${CAREER_API_URL}/api/applications`; PHP proxy removed |
| `frontend/app/api/distributor/applications/route.ts` (new) | -> `${DISTRIBUTOR_API_URL}/api/distributor/applications` |
| `frontend/lib/career/api.ts`, `site.ts`, `types.ts`, `components/career/form/ApplicationForm.tsx` | JSON status mapping (success only on 201 `CREATED`); same-origin endpoint; form action |
| `frontend/lib/contact/api.ts` | removed "not configured" short-circuit; posts to `/api/contact`; success only with `success:true` |
| `frontend/lib/distributor/submit.ts`, `components/distributor/application/{submit-status,mode-badge,application-form}.tsx`, `app/partners/distributor-application/page.tsx` | real submit via proxy; preview mode removed; multiple field errors shown; double-submit guard kept |
| `frontend/components/career/sections/Faq.tsx` | `inert` is only passed as `true`, never `false` (fixes the boolean-attribute warning) |
| `frontend/.env.example` | server-only `*_API_URL` variables; removed `CAREER_BACKEND_URL`, `NEXT_PUBLIC_CONTACT_API_BASE_URL`, `NEXT_PUBLIC_APPLICATION_ENDPOINT` |
| `frontend/scripts/smoke-test.mjs` (new) | marked-record end-to-end smoke test |
| `backends/career-api/src/main/java/.../storage/*` (new, reconstructed) + `docs/RECONSTRUCTED_STORAGE.md`, `.gitignore` | see README; `.gitignore` `storage/` -> `/storage/` |
| `backends/*/Dockerfile`, `.dockerignore` (new) | multi-stage builds, non-root, curl for health checks |
| `docker-compose.yml`, `.env.example`, `db/init/*`, `scripts/*` (new) | orchestration, 3 databases/users on one MySQL, persistent volumes, health-ordered start, safe stop |
| `backends/contact-api/.env.example` (new) | placeholder template (the original had no such file; a personal e-mail in the supplied template was not carried over) |

Unchanged on purpose: all backend business logic, migrations, home page, SkyMap, marketplace, platforms, applications, branding
(icon-only header/footer, no diamond logo), header links, footer top links (Distributor Application, Contact Us).
Security: no secrets committed, no `NEXT_PUBLIC_` backend values, CORS/validation/rate limits untouched.
