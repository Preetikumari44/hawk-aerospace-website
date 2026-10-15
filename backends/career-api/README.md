# Hawk Aerospace Career Page - Java backend

Spring Boot REST API behind the standalone Next.js career page (`../hawk-career-next`). It replaces the former
`submit_interview.php`: validation, CV/licence upload, MySQL persistence, duplicate detection and SMTP notification.

* Java 21, Spring Boot 3.5.16, Maven, Spring Web / Validation / Data JPA (Hibernate), MySQL Connector/J, Spring Mail
* The frontend and this service are independent projects that talk only through the HTTP contract below.

## Verification status (read this first)

This code was written in an environment **without access to Maven Central, MySQL or an SMTP server**, so:

| Item | Status |
| --- | --- |
| Upload validation, path-traversal protection, content sniffing, input normalisation | **Executed**: compiled with javac against minimal framework stubs and run (24/24 checks) |
| Syntax of every Java file (main + test) | **Checked** with javac (no parse errors; all remaining errors were missing third-party jars) |
| Next.js frontend -> `/api/applications` forwarder (multipart, binary integrity, all response mappings, Calendly redirect), build, lint, typecheck | **Executed** against a test-only stub of this contract |
| `mvn compile` / `mvn test` (Spring wiring, JPA mapping, MockMvc tests) | **NOT RUN**: Maven could not download dependencies. Run `mvn test` first; fix anything it reports |
| Real MySQL (`drone_applications` mapping, column lengths, ids) | **NOT VERIFIED** - see `docs/ASSUMED_SCHEMA.md` |
| Real SMTP delivery and attachments | **NOT VERIFIED** |
| Production readiness | **Not claimed** until the three NOT-RUN/NOT-VERIFIED rows above pass in your environment |

## Requirements

Java 21+, Maven 3.9+, MySQL 8 (the existing database), an SMTP account, Node 18.17+ for the frontend.
(No Maven wrapper is included because it could not be generated offline; `mvn wrapper:wrapper` creates one.)

## Configuration (environment variables, nothing is hard-coded)

Copy `.env.example`; Spring Boot reads real environment variables, e.g. `set -a; . ./.env; set +a`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | existing MySQL database | local URL, empty credentials |
| `STORAGE_ROOT` | where uploads are written - **must be outside any web root** | `./storage` |
| `UPLOAD_MAX_FILE_SIZE`, `UPLOAD_MAX_REQUEST_SIZE` | per-file / per-request limit | `5MB` / `12MB` |
| `REQUIRE_LICENSE_FILE` | make licence file mandatory when `hasLicense=yes` | `false` (the PHP accepted it as optional) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_AUTH`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_SSL`, `SMTP_STARTTLS` | SMTP (465 + `SMTP_SSL=true`, or 587 + `SMTP_STARTTLS=true`) | `localhost:1025` (dev mail sink) |
| `MAIL_FROM`, `MAIL_FROM_NAME`, `ADMIN_NOTIFICATION_EMAIL` | sender and recipient | empty -> notifications fail visibly and are retried |
| `CORS_ALLOWED_ORIGINS` | browser origins allowed to call the API | `http://localhost:3000` |
| `PORT` | HTTP port | `8080` |

## Database

1. Check the existing table matches `docs/ASSUMED_SCHEMA.md` (`SHOW CREATE TABLE drone_applications;`). The mapping was
   derived from the PHP INSERT because no schema file was supplied. `ddl-auto` is `none`: the app never alters it.
2. Apply `db/migrations/V1__notification_outbox.sql` - creates one **new** table, `drone_application_notifications`
   (email retry queue). Additive and safe on a live database.
3. Optional: `db/migrations/V2__optional_unique_indexes.sql` adds unique indexes on `email` and `phone` (race-proof
   duplicates across several instances). It has prerequisites (column type, no existing duplicates) - read the header,
   test on a copy first. Never run automatically; it never deletes data.

Existing rows are untouched. Old PHP rows keep their `uploads/cv/...` paths; new rows store keys like `cv/<uuid>.pdf`
relative to `STORAGE_ROOT`.

## Run

    mvn spring-boot:run             # development
    mvn test                        # tests (in-memory H2, temp dir, mocked mail: never touches production)
    mvn clean package               # -> target/hawk-career-backend-1.0.0.jar
    java -jar target/hawk-career-backend-1.0.0.jar

Then verify: `curl localhost:8080/api/health` and `curl localhost:8080/api/health/ready` (database + storage check).

End-to-end with the frontend (separate terminal, in `../hawk-career-next`):

    JAVA_BACKEND_URL=http://localhost:8080 npm run dev      # open http://localhost:3000/apply

Submit a test application, then check: the new `drone_applications` row, the file under `STORAGE_ROOT/cv/`, and the
admin email with attachments. Re-submit with the same email or phone: expect the "already registered" message.
Use a throw-away database/SMTP sink (e.g. MailHog) for this.

## API

### `GET /api/health` - liveness `200 {"status":"UP",...}`
### `GET /api/health/ready` - readiness: `200` when MySQL answers and storage is writable, else `503` with per-check status

### `POST /api/applications` (`multipart/form-data`)
Fields: `fullName, email, country, phoneCode, phone, residency, hasExperience, experienceInfo, ownDrone, ownDroneInfo,
willingTravel, visaInvestment, hasLicense` (yes/no questions are `yes`/`no`) and files `cvFile` (required),
`licenseFile` (optional unless `REQUIRE_LICENSE_FILE=true`). Files: PDF, JPG/JPEG, PNG, WebP; content signature is
checked, not just the extension.

| HTTP | `status` | When |
| --- | --- | --- |
| 201 | `CREATED` | stored. Body: `applicationId`, `message`, `emailNotification` = `SENT` or `PENDING_RETRY` |
| 409 | `DUPLICATE` | same email (case-insensitive) OR same phone already applied |
| 422 | `VALIDATION_ERROR` | field rules; `errors[]` has `{field, message}` (same rules/messages as the frontend) |
| 400 | `INVALID_UPLOAD` | missing/empty CV, wrong type, content does not match extension |
| 413 | `FILE_TOO_LARGE` | file or request over the limit |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | not multipart |
| 503 | `DATABASE_UNAVAILABLE` | database unreachable - nothing stored, uploads removed |
| 500 | `DATABASE_ERROR` / `STORAGE_ERROR` / `INTERNAL_ERROR` | server fault - never reported as success |

No endpoint lists or downloads applications or documents. Review candidates directly in MySQL / on the storage volume.

## Behaviour notes (differences from the PHP script)

* **Email failure no longer looks like a lost application.** PHP stored the row, then answered `MAIL_ERROR`, so a retry
  hit `DUPLICATE`. Now the application and a notification row are committed in one transaction; if SMTP fails the
  response is still `201` with `emailNotification: PENDING_RETRY`, the failure is logged without personal data, and a
  scheduler retries every 5 minutes up to 5 attempts (`GAVE_UP` + ERROR log afterwards; see the outbox table).
* **No duplicate-attempt email.** PHP mailed the admin the name/email/phone of every duplicate attempt. That is dropped to
  avoid needless personal data in email; the attempt is logged without personal data.
* Email is stored lower-cased; phone is stored digits-only; free-text defaults to `Not Provided` as in PHP.
* Admin email values are HTML-escaped (the PHP interpolated raw input).

## Security notes

* **Rotate the old PHP database and SMTP passwords** - they were hard-coded in the previous source. None are used here.
* Run with a least-privilege MySQL user (SELECT/INSERT/UPDATE on `drone_applications`, full on the outbox table).
* Keep `STORAGE_ROOT` outside any served directory, owned by the service user, on a `noexec` mount if possible.
  Files are written `rw-------` under random names; nothing is served statically.
* Put the service behind TLS / a reverse proxy; only the Next.js server needs network access to it. Consider rate
  limiting `/api/applications` at the proxy (the form is public).
* SMTP hostname verification is enabled (`mail.smtp.ssl.checkserveridentity`).
* **Framework support status:** Spring Boot 3.5 is the last 3.x line and its open-source support ended June 2026
  (3.5.16 was the final free patch). Plan a move to Spring Boot 4.x or an enterprise support plan before relying on this
  long term. The 3.x requirement came from the project brief.

## Layout

    controller/   ApplicationController, HealthController
    service/      ApplicationService (orchestration), ApplicationPersistenceService (transaction), NotificationService (+ retry job), KeyedLock
    repository/   Spring Data JPA repositories
    entity/       DroneApplication (existing table), NotificationOutbox (new table)
    dto/          ApplicationRequest (multipart form + validation), responses
    validation/   InputNormalizer, @YesNo
    exception/    domain exceptions + GlobalExceptionHandler (uniform JSON errors)
    storage/      FileStorageService, FileSignature (magic bytes), DetectedType
    config/       AppProperties, CORS
    db/migrations SQL (outbox table; optional unique indexes)
