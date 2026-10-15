-- Distributor / Dealer applications (MySQL 8.0+ / 8.4 LTS, InnoDB, utf8mb4).
-- (Career applications will get their own tables in a later phase.)
--
-- Notes for MySQL:
--   * UUIDs are stored as CHAR(36) text (readable in the mysql client). The JPA entity maps them with
--     @JdbcTypeCode(SqlTypes.CHAR) so Hibernate's schema validation agrees with this definition.
--   * Timestamps are DATETIME(6) and always hold UTC (the JDBC layer is configured for UTC).
--   * utf8mb4 is required so the euro sign in the turnover options (and any applicant text) is stored losslessly.
--   * Plain indexes only (MySQL has no partial indexes). The column collation is case-insensitive, so the
--     e-mail index already serves case-insensitive look-ups.

CREATE TABLE distributor_applications (
    id                           CHAR(36)      NOT NULL,
    country                      VARCHAR(100)  NOT NULL,
    city                         VARCHAR(150)  NOT NULL,
    company_name                 VARCHAR(200)  NOT NULL,
    website                      VARCHAR(255)  NULL,
    business_type                VARCHAR(50)   NOT NULL,
    turnover                     VARCHAR(50)   NOT NULL,
    applicant_name               VARCHAR(150)  NOT NULL,
    job_title                    VARCHAR(150)  NULL,
    email                        VARCHAR(254)  NOT NULL,
    country_code                 VARCHAR(8)    NOT NULL,
    phone                        VARCHAR(30)   NOT NULL,
    brands                       VARCHAR(2000) NULL,
    message                      VARCHAR(5000) NULL,

    -- Private document reference only (relative path inside the private storage root). Never a public URL.
    document_ref                 VARCHAR(255)  NULL,
    document_original_name       VARCHAR(255)  NULL,
    document_content_type        VARCHAR(150)  NULL,
    document_size_bytes          BIGINT        NULL,

    status                       VARCHAR(20)   NOT NULL DEFAULT 'NEW',
    submitted_at                 DATETIME(6)   NOT NULL,
    updated_at                   DATETIME(6)   NOT NULL,

    -- Accidental double-submit protection: sha256(content) + ":" + time bucket. Unique.
    dedupe_key                   VARCHAR(100)  NOT NULL,

    -- Admin notification e-mail state, so failed deliveries can be retried safely.
    notification_status          VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    notification_attempts        INT           NOT NULL DEFAULT 0,
    notification_last_attempt_at DATETIME(6)   NULL,
    notification_last_error      VARCHAR(500)  NULL,

    PRIMARY KEY (id),
    CONSTRAINT uq_distributor_applications_dedupe_key UNIQUE (dedupe_key),
    CONSTRAINT ck_distributor_applications_status
        CHECK (status IN ('NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
    CONSTRAINT ck_distributor_applications_notification_status
        CHECK (notification_status IN ('PENDING', 'SENT', 'FAILED')),
    CONSTRAINT ck_distributor_applications_document
        CHECK ((document_ref IS NULL) = (document_size_bytes IS NULL))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE distributor_application_models (
    application_id CHAR(36)    NOT NULL,
    position       INT         NOT NULL,
    model          VARCHAR(50) NOT NULL,
    PRIMARY KEY (application_id, position),
    CONSTRAINT fk_distributor_application_models_application
        FOREIGN KEY (application_id) REFERENCES distributor_applications (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX ix_distributor_applications_submitted_at ON distributor_applications (submitted_at DESC);
CREATE INDEX ix_distributor_applications_status ON distributor_applications (status);
CREATE INDEX ix_distributor_applications_email ON distributor_applications (email);
-- Serves the notification retry query (rows whose notification is not SENT, oldest first).
CREATE INDEX ix_distributor_applications_notification_pending
    ON distributor_applications (notification_status, submitted_at);
