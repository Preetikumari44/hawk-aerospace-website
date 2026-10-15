-- ADDITIVE migration: creates a NEW table that tracks the confirmation e-mail sent to each applicant.
-- It does not touch, alter or delete anything in `drone_applications` or `drone_application_notifications`.
-- Safe to run on a live database. Run it with a privileged account (the application user cannot CREATE).
-- If this table is missing the application is still saved and the admin e-mail is still sent; only the
-- applicant confirmation is skipped (an error is logged).
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
