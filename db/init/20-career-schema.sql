-- LOCAL / NEW-INSTALL ONLY. The Careers backend expects an EXISTING `drone_applications` table (it was owned by the
-- old PHP site) and the ZIP supplied no schema file. This is the schema the backend's entity maps, taken from
-- backends/career-api/docs/ASSUMED_SCHEMA.md and the JPA entity. It is only created when the table does not exist,
-- so an existing production table is never touched. Verify against your real table with SHOW CREATE TABLE.
-- Plus db/migrations/V1__notification_outbox.sql (additive, new table).
USE hawk_career;

CREATE TABLE IF NOT EXISTS drone_applications (
  id             INT          NOT NULL AUTO_INCREMENT,
  fullName       VARCHAR(255) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  phoneCode      VARCHAR(20)  NOT NULL,
  phone          VARCHAR(30)  NOT NULL,
  country        VARCHAR(50)  NOT NULL,
  residency      VARCHAR(10)  NOT NULL,
  hasLicense     VARCHAR(10)  NOT NULL,
  hasExperience  VARCHAR(10)  NOT NULL,
  experienceInfo TEXT         NULL,
  ownDrone       VARCHAR(10)  NOT NULL,
  ownDroneInfo   TEXT         NULL,
  willingTravel  VARCHAR(10)  NOT NULL,
  visaInvestment VARCHAR(10)  NOT NULL,
  cvFile         VARCHAR(255) NOT NULL DEFAULT '',
  licenseFile    VARCHAR(255) NOT NULL DEFAULT '',
  created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_email (email),
  KEY idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS drone_application_confirmations (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  application_id BIGINT       NOT NULL,
  status         VARCHAR(16)  NOT NULL,
  attempts       INT          NOT NULL DEFAULT 0,
  last_error     VARCHAR(500) NULL,
  created_at     DATETIME(6)  NOT NULL,
  updated_at     DATETIME(6)  NOT NULL,
  sent_at        DATETIME(6)  NULL,
  version        BIGINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_confirmations_application (application_id),
  KEY idx_confirmations_status_updated (status, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS drone_application_notifications (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  application_id BIGINT       NOT NULL,
  status         VARCHAR(16)  NOT NULL,
  attempts       INT          NOT NULL DEFAULT 0,
  last_error     VARCHAR(500) NULL,
  created_at     DATETIME(6)  NOT NULL,
  updated_at     DATETIME(6)  NOT NULL,
  sent_at        DATETIME(6)  NULL,
  version        BIGINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_notifications_status_updated (status, updated_at),
  KEY idx_notifications_application (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
