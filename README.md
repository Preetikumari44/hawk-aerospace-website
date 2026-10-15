# Hawk Aerospace - Final Integrated Website

One project: the main Hawk Aerospace Next.js website plus the three existing Java Spring Boot backends
(Contact Us, Careers, Distributor Application), one MySQL server (three separate databases) and one start command.

```
frontend/                 Main website (Next.js 16, React 19). The only public-facing app.
backends/contact-api/     Contact Us backend      (Spring Boot 3.4, MySQL + Flyway)   POST /api/v1/contact
backends/career-api/      Careers backend         (Spring Boot 3.5, MySQL)            POST /api/applications
backends/distributor-api/ Distributor backend     (Spring Boot 3.4, MySQL + Flyway)   POST /api/distributor/applications
db/init/                  MySQL first-start scripts (creates the 3 databases/users; Careers dev schema)
docker-compose.yml        Whole stack
scripts/                  start / stop (PowerShell and bash)
docs/                     INTEGRATION-REPORT.md, TEST-REPORT.md, history/
```

> **Read `docs/TEST-REPORT.md` first.** The Java backends and Docker stack could not be built or run in the
> environment that produced this ZIP (no Maven Central, Docker or MySQL). What was and was not verified is listed there.

## Notes you need to know
* **The Careers backend is Java, not PHP**, and all three databases are **MySQL**, not PostgreSQL. The ZIPs supplied
  Java/MySQL, so that is what is wired. The old PHP career endpoint (`submit_interview.php`) is gone.
* **The Careers backend ZIP was missing its `storage/` Java package** (excluded by its own `.gitignore`), so it could
  not compile. Five classes were re-written from their call sites - see `backends/career-api/docs/RECONSTRUCTED_STORAGE.md`.
  If you have the original package, drop it in.
* The Careers backend needs an existing `drone_applications` table; no schema was supplied. `db/init/20-career-schema.sql`
  creates an assumed one **only if absent**. Check it against your real table.
* The old Careers `.env` password leak: the earlier PHP code had hard-coded DB/SMTP credentials. Rotate them.

## Requirements
Windows 10/11 + PowerShell and **Docker Desktop** (Compose v2), or Linux/macOS with Docker. Nothing else is needed
to run the stack (Node/Java/Maven are used inside the images). Optional: Node 18+ on the host to run the smoke test.
For development without Docker: Node 22, JDK 21, Maven 3.9, MySQL 8.x.

## Run
1. Extract the ZIP, open PowerShell in the folder.
2. `Copy-Item .env.example .env`, then edit `.env` and replace the four `CHANGE_ME` database passwords.
3. Enable real Gmail delivery once: turn on 2-Step Verification for `preetikumari3224@gmail.com`, create a Google
   App Password, then run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\configure-gmail.ps1`.
   Enter the App Password at its hidden prompt; do not put
   your regular Gmail password in `.env`. This stores the SMTP settings in your local, gitignored `.env` and restarts
   the APIs. It sends company notifications to `preetikumari3224@gmail.com` and sends a confirmation to each valid
   applicant e-mail address. Without an App Password, Gmail delivery cannot be authenticated.
   On Linux/macOS, set the same `SMTP_*`, `MAIL_FROM`, and notification address values directly in `.env`.
4. `./scripts/start.ps1` (Linux/macOS: `./scripts/start.sh`). First start builds the images (several minutes) and starts, in order:
   MySQL -> Contact / Careers / Distributor APIs (wait for healthy MySQL) -> website (waits for healthy APIs).
5. Open **http://localhost:3000**.

| What | URL |
|---|---|
| Website | http://localhost:3000 (pages: `/contact`, `/career`, `/career/apply`, `/partners/distributor-application`) |
| Contact API health | http://localhost:8081/actuator/health |
| Careers API health | http://localhost:8082/api/health/ready (database + storage) |
| Distributor API health | http://localhost:8083/actuator/health |
| Mailpit (test e-mails) | http://localhost:8025 |
| MySQL (localhost only) | `127.0.0.1:3307` |

The browser only talks to the website. Its routes `/api/contact`, `/api/career/applications` and
`/api/distributor/applications` forward to the backends over the private Docker network (`CONTACT_API_URL`,
`CAREER_API_URL`, `DISTRIBUTOR_API_URL` - server-side only, never `NEXT_PUBLIC_`). The backend ports are bound to
127.0.0.1 only for health checks/debugging; do not publish them.

## Stop (data is kept)
`./scripts/stop.ps1` = `docker compose --profile mail-dev down`. Database and uploads live in named volumes
(`hawk_mysql_data`, `hawk_career_uploads`, `hawk_distributor_uploads`) and survive. **Never run `docker compose down -v`
unless you want to delete all stored applications.** Nothing in the start/stop scripts deletes data. MySQL init scripts
run only on an empty volume.

## Verify a submission
* Automatic: `docker compose exec frontend node scripts/smoke-test.mjs` (submits one marked record to each form
  through the website's own API and prints PASS/FAIL).
* Manual: fill each form in the browser; you should see the backend's real success/error text.
* Check storage (marker = `SMOKE-TEST-...` or your own text):
  ```
  docker compose exec mysql mysql -uroot -p hawk_contact     -e "SELECT id,name,email,created_at FROM contact_messages ORDER BY id DESC LIMIT 5"
  docker compose exec mysql mysql -uroot -p hawk_career      -e "SELECT id,fullName,email,cvFile FROM drone_applications ORDER BY id DESC LIMIT 5"
  docker compose exec mysql mysql -uroot -p hawk_distributor -e "SELECT id,company_name,email,status,notification_status FROM distributor_applications ORDER BY submitted_at DESC LIMIT 5"
  ```
  Uploaded files: `docker compose exec career-api ls /data/uploads/cv`, `docker compose exec distributor-api ls /data/uploads`.
* With Gmail configured, check the admin inbox and the applicant address used in the form. Gmail SMTP delivery is
  retried on transient failure; check `docker compose logs contact-api career-api distributor-api` if a message
  does not arrive. Mailpit (http://localhost:8025) is only for local testing when SMTP is explicitly configured to
  use `mailpit`; it does not deliver messages to real inboxes.
* **Cleaning up test data** - delete only your marked rows, e.g.
  `DELETE FROM contact_messages WHERE name LIKE 'SMOKE-TEST-%';`, `DELETE FROM drone_applications WHERE fullName LIKE 'SMOKE-TEST-%';`
  (also delete the matching file under `/data/uploads`), `DELETE FROM distributor_applications WHERE company_name LIKE 'SMOKE-TEST-%';`
  (models rows are removed with it if the FK cascades; check `distributor_application_models`).

## Where records are stored
| Form | Database | Table | Files |
|---|---|---|---|
| Contact | `hawk_contact` | `contact_messages` (Flyway V1/V2) | - |
| Careers | `hawk_career` | `drone_applications`, `drone_application_notifications` | CV/licence in `career-api:/data/uploads/{cv,license}` |
| Distributor | `hawk_distributor` | `distributor_applications`, `distributor_application_models` (Flyway V1) | `distributor-api:/data/uploads` |

## Troubleshooting
* **Port already in use**: change `FRONTEND_HOST_PORT`, `MYSQL_HOST_PORT` (default 3307), `CONTACT_HOST_PORT`, `CAREER_HOST_PORT`, `DISTRIBUTOR_HOST_PORT` in `.env`.
* **A form says "temporarily unavailable" / "could not reach the service"**: `docker compose ps` and `docker compose logs <service>`. The website never shows success unless the backend confirmed it.
* **Database errors / backend unhealthy**: check `docker compose logs mysql`. Init scripts only run on an *empty* volume; if you changed a DB password in `.env` after the first start, the old password is still in MySQL - change it with `ALTER USER`, don't delete the volume.
* **Migrations**: Contact and Distributor run Flyway on startup. Careers does not migrate (see `backends/career-api/db/migrations`, optional unique-index script V2 has prerequisites - read its header).
* **CORS**: only matters for direct browser calls to a backend; set `PUBLIC_SITE_ORIGIN` to the real site origin in production.
* **E-mail**: the application is saved first; a failed e-mail is retried automatically (Careers/Distributor outboxes,
  Contact retry job). Gmail requires 2-Step Verification and an App Password. Run `scripts/configure-gmail.ps1`;
  the password is entered hidden and written only to your local `.env`. Applicant confirmations go to the address
  on the submitted form; company notification details go to the three notification addresses.
* **File uploads**: Careers 5 MB per file (PDF/JPG/PNG/WebP, 12 MB total); Distributor 10 MB per file. Larger files are rejected by the backend and the proxy.
* **Rate limits**: 5 submissions / 10 min per visitor IP on each backend. Behind a public reverse proxy, make that proxy overwrite `X-Forwarded-For`; the website forwards the first address it receives.
* **Production**: put TLS in front, set `PUBLIC_SITE_ORIGIN`, real SMTP, strong passwords; keep backend ports unpublished.

## Features that still need your credentials / deployment
Gmail App Password (for real e-mail delivery), Twilio OTP login (`TWILIO_*`), AgriSure launch URL (`AGRISURE_URL`),
TLS/domain, production DB hardening.
