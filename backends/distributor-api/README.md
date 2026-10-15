# Hawk Aerospace — Distributor / Dealer backend

Java 21 · Spring Boot 3.4 · Maven · **MySQL 8** (Connector/J) · Spring Data JPA · Flyway · Spring Mail · OpenAPI

Backend for the standalone Next.js app `../hawk-distributor-application`. **The full setup guide with exact Windows PowerShell commands,
the API reference, failure policy, security notes and troubleshooting is in the top-level [`../README.md`](../README.md).** This file is the short version.

The Career application is **out of scope** (own module/tables later); package, tables and endpoints here are distributor-specific.

## Quick start (PowerShell)
```powershell
Copy-Item .env.example .env ; notepad .env          # replace every change-me*
docker compose up -d mysql ; docker compose ps       # wait for (healthy)
mvn clean verify                                     # tests need Docker (Testcontainers MySQL) or TEST_MYSQL_URL
mvn spring-boot:run                                  # http://localhost:8080
Invoke-RestMethod http://localhost:8080/actuator/health
```

## Endpoints
| Method & path | Who | Purpose |
|---|---|---|
| `POST /api/distributor/applications` | public | Submit (`multipart/form-data`). **No public GET.** |
| `GET /actuator/health` | public | Health incl. database |
| `GET /api/admin/distributor/applications[?status=&page=&size=]`, `GET …/{id}` | ADMIN | List / read |
| `PATCH /api/admin/distributor/applications/{id}/status` | ADMIN | `NEW / IN_REVIEW / APPROVED / REJECTED` |
| `GET /api/admin/distributor/applications/{id}/document` | ADMIN | Authorised file download |
| `/swagger-ui.html`, `/v3/api-docs` | only if `SWAGGER_ENABLED=true` | OpenAPI (off by default) |

Submission fields (exact frontend names): `country, city, models[], companyName, website, businessType, turnover, name, jobTitle, email, countryCode, phone, brands, message, file`.
Responses: `201` saved (`notificationStatus` SENT, or FAILED + `warning: NOTIFICATION_NOT_DELIVERED`), `200` duplicate collapsed, `400` validation/file
(`code`, `errors[]`), `415`, `429` + `Retry-After`, `503` database down, `500` storage/unexpected — always JSON `{success, message, …}`.

## Database (MySQL)
* Schema owned by Flyway: `src/main/resources/db/migration/V1__create_distributor_applications.sql` (InnoDB, `utf8mb4_unicode_ci`,
  `CHAR(36)` UUIDs, `DATETIME(6)` UTC timestamps, CHECK constraints — MySQL 8.0.16+ enforces them). Hibernate only validates (`ddl-auto=validate`).
* Tables: `distributor_applications`, `distributor_application_models` (ordered, FK `ON DELETE CASCADE`).
* JDBC URL example: `jdbc:mysql://localhost:3306/hawk_distributor?connectionTimeZone=UTC&allowPublicKeyRetrieval=true&sslMode=PREFERRED`
  (production: `sslMode=REQUIRED` or `VERIFY_IDENTITY`, no `allowPublicKeyRetrieval`).
* `docker-compose.yml`: MySQL 8.4, named volume `hawk_mysql_data`, health check (`mysqladmin ping` over TCP), bound to `127.0.0.1`; optional `mailpit` SMTP sink (`--profile mail-dev`).

## Configuration
Everything comes from environment variables / `.env` (see `.env.example`); there are no credential defaults. Startup fails on missing required values or a wildcard CORS origin.

## Security notes
* **Files:** whitelist (pdf, doc, docx, ppt, pptx, xls, xlsx, png, jpg, jpeg), 10 MB (`spring.servlet.multipart` + `FileContentInspector`), magic-byte / OOXML central-directory
  verification (never decompressed), server-generated names `yyyy/MM/<uuid>.<ext>` under `STORAGE_ROOT`, path re-validated on every read, never served publicly; only a safe reference is stored in MySQL.
* **E-mail:** sent after commit, Reply-To = validated applicant e-mail (CR/LF impossible); each attempt recorded; `NotificationRetryJob` retries `PENDING/FAILED` rows.
* **Duplicates:** UNIQUE `dedupe_key = sha256(content + file) : time bucket`; identical re-submits within `DUPLICATE_WINDOW_SECONDS` return the original.
* **Rate limit:** 5 / 10 min / client address, in memory (per instance). **CORS:** exact origins only.

## Remaining deployment requirements
* Rotate the SMTP password that was exposed in the legacy `distributor.php`; use a secret manager.
* TLS in front; `FORWARD_HEADERS_STRATEGY=framework` only behind a trusted proxy.
* Persistent, backed-up storage for `STORAGE_ROOT` (or implement `DocumentStorage` for object storage); consider antivirus scanning of uploads.
* Several instances: shared rate limiter and a lock (e.g. ShedLock) around `NotificationRetryJob`.
* Production MySQL: TLS, least-privilege user, backups, not publicly reachable. Disable Swagger (default) and restrict `/api/admin/**` network access.
* Add the Maven Wrapper (`mvn -N wrapper:wrapper`) if your CI requires it.
