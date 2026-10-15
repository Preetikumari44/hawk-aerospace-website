-- ADDITIVE migration: creates a NEW table used to retry failed admin-notification emails.
-- It does not touch, alter or delete anything in `drone_applications`. Safe to run on a live database.
-- No foreign key is declared on purpose: the id type of the legacy drone_applications table (INT vs BIGINT)
-- has not been verified, and a mismatched FK would fail to create.
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
