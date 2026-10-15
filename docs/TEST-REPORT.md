# Test report (honest status)

Environment that produced this ZIP: Linux sandbox with Node 22, JDK 21 (runtime + compiler module), **no Maven Central
access, no Docker, no MySQL, no SMTP, no browser**. Nothing below is claimed beyond what was actually run.

## Executed and passed
| Check | Result |
|---|---|
| `npm ci` (frontend, lockfile) | OK |
| `tsc --noEmit` (frontend) | 0 errors |
| `next build` (production, Next 16.2.9) | OK; routes `/`, `/career`, `/career/apply`, `/contact`, `/partners/distributor-application`, `/marketplace`, `/platforms`, `/applications`, `/about` and the 3 new API routes built |
| `next start` page requests | all 9 pages above return HTTP 200 |
| Header / footer (served HTML of `/contact`) | header contains neither "Contact Us" nor "Distributor"; footer lists "Distributor Application" then "Contact Us"; no "Dealer Application" text |
| Proxy routes vs **contract stubs** (`node` stand-ins written from the real controllers/DTOs, not the real backends) | contact 201 ok / 422 invalid; careers 201 CREATED / 409 DUPLICATE / 422; distributor multipart with 2 `models[]` + file 201 / 400 - all 7 smoke checks PASS |
| Failure honesty | backend unreachable -> 502, backend URL unset -> 503, wrong media type -> 415; all JSON `success:false`, none can be shown as success |
| Reconstructed Careers `storage` package | compiled with javac against minimal Spring/SLF4J stubs and exercised: 15/15 checks (type whitelist, magic bytes, fake PDF, extension mismatch, empty, oversize, path traversal, cleanup, readiness) |

## Pre-existing lint findings (unchanged, not introduced here)
`npm run lint`: 4 errors / 8 warnings, identical on the original main-site ZIP (import-sort in `my-bookings`, `register`,
`customer-welcome`; `setState` in effect in `weather-chip`). Files were left untouched on purpose (no unrelated changes).

## NOT verified - you must run these
| Item | Why | How |
|---|---|---|
| `mvn package` / `mvn test` of the 3 backends | Maven could not download dependencies | `docker compose build` runs `mvn package` (tests skipped in image); run `mvn test` in each backend |
| **Careers backend compiles at all** | the reconstructed `storage` classes are checked only against stubs, not against real Spring | same as above; fix any compile message |
| Docker images, Compose health checks, start order | no Docker | `./scripts/start.ps1` |
| Flyway migrations on real MySQL; JPA/`validate` mapping | no MySQL | watch `docker compose logs contact-api distributor-api` |
| Careers `drone_applications` schema | assumed (`db/init/20-career-schema.sql`) | compare with your real table |
| Real end-to-end persistence for all three forms (Browser -> API -> DB -> response) | needs the stack running | `docker compose exec frontend node scripts/smoke-test.mjs`, then the SELECTs in README |
| Uploaded files on disk; e-mail delivery (Mailpit and real SMTP); retry jobs | needs the stack | README "Verify a submission" |
| Contact backend with Mailpit | it hard-codes `smtp.auth=true`; behaviour with an empty username is untested | use real SMTP creds if mail fails |
| Browser behaviour: JS console, React `inert` warning, responsive layouts, form UI | no browser available | open `/career` and FAQ in a browser console |
| `inert` fix | changed `inert={!isOpen}` to a spread that only passes `inert: true` when closed (never `false`), which works in any React version | check console |
| PowerShell scripts | pwsh not available | run `scripts/start.ps1` |

Do not treat the project as production-ready until the "NOT verified" rows pass on your machine.
