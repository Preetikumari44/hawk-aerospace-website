# Backend test report (written honestly)

**The Spring Boot application was NOT compiled with Maven, started, or tested in the environment where this MySQL conversion was produced.**
The sandbox could reach npm and Ubuntu packages but not Maven Central, so Spring/Hibernate/Flyway/Mail/JUnit jars could not be downloaded, and Docker was not installed.
Acceptance items 1 (Docker health check), 2, 3 (Flyway itself), 5, 6, 9, 10 and 11 below are therefore **not verified end to end**. Run `mvn clean verify` on a machine with internet access and Docker.

## Actually executed
| What | How | Result |
|---|---|---|
| `V1__create_distributor_applications.sql` | Applied with the `mysql` client, as a non-root user, to a real **MySQL 8.0.46** (native Ubuntu package, strict SQL mode, default settings) | Applies cleanly; 2 tables, 7 indexes, InnoDB, `utf8mb4_unicode_ci` |
| DB constraints | Valid row + 2 models inserted; then tried: duplicate `dedupe_key`, invalid `status`, invalid `notification_status`, NULL `company_name`, `document_ref` without size, orphan model row; deleted parent | Every invalid insert rejected with the expected error (1062 / 3819 / 1048 / 1452); `ON DELETE CASCADE` removed the models; `€` stored as `E282AC` (utf8mb4) |
| Worst-case row | One row with every VARCHAR at maximum length filled with 4-byte characters | Fits MySQL's row-size limit |
| Java syntax | `javac` (JDK 21) over all main + test sources | 830 errors, **all** "package/symbol does not exist" for unavailable libraries; 0 syntax errors. This is a weak check, not a build |
| Frontend `npm run lint`, `typecheck`, `build` | Node 22 | Pass. `npm run build` **without** `NEXT_PUBLIC_API_BASE_URL` fails with the intended message; with it, `/` and `/distributor` build |
| Frontend `submitApplication()` | Run (via `tsx`) against a stand-in Node HTTP server (not the Java backend) | Posts to `/api/distributor/applications` (trailing slash in base URL handled), `multipart/form-data`, repeated `models[]`, exact field names, `file` part, `Accept: application/json`; maps 201, 201+warning, 400 with `errors[]`, 429, non-JSON 502, and "server down" to the right banners |

## Written but NOT executed (need `mvn clean verify`; Docker for Testcontainers, or `TEST_MYSQL_URL`)
* `DistributorApplicationApiTest` (MockMvc + real MySQL 8.4): valid multipart submission persisted with ordered models and stored file; no-file/no-models submission; invalid fields → 400 with per-field errors and nothing saved; bad/fake/oversized files; SMTP failure after save → 201 + `NOTIFICATION_NOT_DELIVERED`; database failure → 503, no row, no orphan file, no e-mail; duplicate collapsed while a different company is stored; no public GET; admin 401/200, status change, document download; CORS allowed vs forbidden origin.
* `DatabaseMigrationTest` (new): Flyway history shows V1 successful; tables are InnoDB/utf8mb4; the database itself rejects invalid status and duplicate `dedupe_key`; euro round trip; `/actuator/health` is `UP`.
* `RateLimitApiTest`, `ApplicationRequestValidationTest`, `ApplicationOptionsTest`, `LocalDocumentStorageTest`, `FileContentInspectorTest`, `FixedWindowRateLimiterTest`. (The last two were run standalone against the JDK in an earlier phase of this project, before the MySQL conversion; they do not touch the database and were not changed.)

## Highest-risk items to watch on the first `mvn verify` (not verifiable here)
1. **Hibernate schema validation vs the MySQL migration.** The entity pins `@JdbcTypeCode(SqlTypes.CHAR)` on the UUID id (matches `CHAR(36)`) and `@JdbcTypeCode(SqlTypes.VARCHAR)` on both enum columns (so Hibernate does not expect a native MySQL `ENUM`). These follow Hibernate 6 behaviour as I know it but were not executed. A `Schema-validation: wrong column type` error would point here.
2. `.env` auto-import (`spring.config.import: optional:file:./.env[.properties]`) — standard Spring Boot feature, not run.
3. Testcontainers `mysql:8.4` image pull and Flyway 10 `flyway-mysql` on MySQL 8.4.

## Not verified at all
Docker Compose (the file was only parsed as YAML; MySQL health check and the Mailpit profile never ran), real SMTP delivery, the browser → Java submission, a backend restart keeping data, Spring Security chain behaviour, springdoc output, every PowerShell command in the README (no Windows host), MySQL 8.4 specifically (8.0.46 was used), behaviour under concurrent submissions.
