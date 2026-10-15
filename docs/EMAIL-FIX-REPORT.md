# Email fix + footer branding - change & verification report

**Read this first:** the code changes are complete, but the Java backends could **not be compiled or run** in the
environment used to make them (no Maven, no Docker, no access to Maven Central), and **no real SMTP credentials were
available**. Nothing below claims runtime or inbox delivery that was not actually observed.

## 1. Files changed

| File | Why |
|---|---|
| `backends/contact-api/src/main/resources/application.yml` | **Root-cause fix:** `mail.smtp.auth` was hard-coded `true`; now `${SMTP_AUTH:true}` |
| `docker-compose.yml` | contact-api never received `SMTP_AUTH`; added `SMTP_AUTH: ${SMTP_AUTH:-false}` (same as the other two services) |
| `backends/contact-api/.../mail/EmailNotificationService.java` | new `confirmApplicant()` (visitor confirmation, tracked separately) |
| `backends/contact-api/.../mail/NotificationRetryJob.java` | also retries failed confirmations |
| `backends/contact-api/.../contact/ContactService.java` | calls `confirmApplicant()` after the company notification |
| `backends/contact-api/.../contact/ContactMessage.java`, `ContactMessageRepository.java` | confirmation state fields / queries |
| `backends/contact-api/.../db/migration/V3__contact_messages_confirmation_tracking.sql` | NEW, additive columns only; existing rows marked SENT (no retro e-mails). Applied by Flyway on startup |
| `backends/career-api/.../service/NotificationService.java` | applicant confirmation send / retry |
| `backends/career-api/.../service/ApplicationService.java` | calls confirmation after the commit and the HR notification |
| `backends/career-api/.../entity/ConfirmationOutbox.java`, `repository/ConfirmationOutboxRepository.java` | NEW, own table so the existing outbox and `drone_applications` are untouched |
| `backends/career-api/db/migrations/V3__applicant_confirmations.sql`, `db/init/20-career-schema.sql` | NEW table `drone_application_confirmations` (additive) |
| `backends/distributor-api/.../notification/ApplicationNotificationService.java`, `NotificationRetryJob.java` | applicant confirmation send / retry |
| `backends/distributor-api/.../service/ApplicationSubmissionService.java` | calls confirmation after the admin notification |
| `backends/distributor-api/.../domain/DistributorApplication.java`, `repository/DistributorApplicationRepository.java` | confirmation state |
| `backends/distributor-api/.../db/migration/V2__distributor_applications_confirmation_tracking.sql` | NEW, additive columns, existing rows marked SENT. Applied by Flyway |
| `frontend/components/homepage/footer/default.tsx` | "Hawk Aerospace" text beside the existing icon (single shared footer) |
| `.env.example` | Gmail SMTP instructions; sender + three recipients default to the requested address; **no password** |
| `.../mail/MailDiagnostics.java` (one per backend, NEW) + the three notification services | safe exception-chain logging so the real failure cause is visible |
| Tests: contact `ContactServiceTest` (+ new `EmailNotificationServiceTest`), career `AbstractApiTest`/`ApplicationApiTest`, distributor `DistributorApplicationApiTest` | updated for the second e-mail (not executed) |

Not changed: API paths/payloads/responses, form fields, validation, uploads, ports, service names, volumes, existing tables/columns, other pages.

## 2. Root cause of the Contact Us `IllegalStateException` - FOUND (by source evidence)

`EmailNotificationService.send()` in contact-api created `new MimeMessageHelper(mime, false, "UTF-8")` (multipart = false)
and then called `helper.setText(plainBody, htmlBody)`. In Spring's `MimeMessageHelper` (v6.2.6 source read), the two-argument
`setText(plain, html)` calls `getMainPart()` -> `getMimeMultipart()`, which throws
`IllegalStateException("Not in multipart mode - create an appropriate MimeMessageHelper via a constructor that takes a
'multipart' flag ...")` when the helper was built with multipart = false.

It is thrown while *building* the message, before any SMTP connection, so it happened on every send and every retry no matter
what the SMTP settings were. That matches your log exactly: enquiry stored, notification failed (IllegalStateException),
retry failed. Fix: `multipart = true`.

I copied the same mistake into my first versions of the Contact and Career *confirmation* emails; both are fixed too
(Distributor's confirmation uses single-part text and was never affected; Career/Distributor admin emails already used multipart).

Separately fixed: contact-api hard-coded `mail.smtp.auth: true` and Compose never passed `SMTP_AUTH`, which breaks no-login relays
such as Mailpit (a different, authentication-type failure). Safe exception-chain logging was also added to all three services.

*Evidence level: Spring source plus the project code and your log. The fixed code has NOT been executed here (no Maven/Docker),
so "the fix works" is unverified until you run it.*

## 3. Implementation status (code written; not run)

| Form | Company notification | Applicant confirmation |
|---|---|---|
| Contact Us | existing, root cause fixed | NEW, to the visitor's address, separate retry state |
| Career | existing (CV/licence attached) | NEW, to the candidate's address, own table |
| Distributor/Dealer | existing | NEW, includes application reference + submitted summary |

Design points: the company recipient only ever comes from env (`*_NOTIFICATION_EMAIL`); the submitted address is only the
confirmation recipient. Saving never depends on mail (commit first, mail after, errors caught). Failures store only the
exception chain and a redacted root-cause message, never credentials, addresses or bodies. Duplicate/idempotent submissions do not re-send (existing dedupe
paths return before any mail; confirmation state is per record so retries cannot double-send).

## 4. Verification actually performed

| Check | Result |
|---|---|
| Frontend `npm ci`, `tsc --noEmit`, `next build` | **Passed** |
| Footer text in prerendered HTML (/, /contact, /about, /career, /career/apply, /marketplace, /platforms, /partners/distributor-application, /admin) | **Present once on each** |
| `/applications`, `/track/[id]` footers | Same shared component; dynamic pages, not inspected as HTML |
| Java syntax check (`javac` parse, dependency errors ignored) on all three backends | **No syntax errors**. This is NOT a compile |
| Maven build / unit & integration tests (all three backends) | **Not executed** (no Maven / Central access) |
| Docker Compose validation, startup, health, networking | **Not executed** (no Docker) |
| DB persistence, resume upload, invalid-input, SMTP-failure, duplicate tests | **Not executed** (existing tests were updated, never run) |
| Six e-mail paths against Mailpit | **Not executed** |
| Real Gmail SMTP / inbox delivery | **Not executed**: no App Password supplied |

## 5. Before you rely on it (your steps)

1. `.env`: set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_AUTH=true`, `SMTP_SSL=false`, `SMTP_STARTTLS=true`,
   `SMTP_USERNAME=preetikumari3224@gmail.com`, `SMTP_PASSWORD=<Google App Password>` (2-Step Verification required).
   Never commit `.env`.
2. **Existing Career database:** run `backends/career-api/db/migrations/V3__applicant_confirmations.sql` with a privileged
   MySQL account (the app user cannot CREATE). Until then Career still saves and still e-mails HR; only the applicant
   confirmation is skipped with a logged error. Fresh installs get the table from `db/init`.
3. Contact and Distributor add their columns automatically through Flyway on first start.
4. `docker compose --profile mail-dev up --build`, submit each form, check http://localhost:8025 (that proves the
   app handed mail to SMTP, not inbox delivery), then repeat with Gmail and confirm both messages per form in real inboxes.
5. `mvn test` in each backend (distributor tests need Docker for Testcontainers/MySQL).

## 6. Noted, deliberately not changed

- `components/skymap/skymap-site.tsx` has its own SkyMap-branded footer (not the Hawk icon), left alone.
- Career's applicant-confirmation row is written after the application commit (own table), so a crash in that tiny window
  skips that one confirmation; the admin notification keeps its transactional outbox.
