-- V2: additive columns only - existing rows and columns are untouched.
--   reference_id            public reference shown to the visitor after submitting
--   fingerprint             SHA-256 of the normalised enquiry, used for duplicate detection
--   notification_*          state of the SMTP notification so failures can be retried
-- Rows that existed before this migration are marked SENT (they were handled by the old flow),
-- so the retry job never re-sends them.
ALTER TABLE `contact_messages`
  ADD COLUMN `reference_id`            CHAR(36)          NULL,
  ADD COLUMN `fingerprint`             CHAR(64)          NULL,
  ADD COLUMN `notification_status`     VARCHAR(16)       NOT NULL DEFAULT 'SENT',
  ADD COLUMN `notification_attempts`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN `notified_at`             DATETIME          NULL,
  ADD COLUMN `last_notification_error` VARCHAR(255)      NULL;

-- New rows start as PENDING; the application always sets the value explicitly.
ALTER TABLE `contact_messages` ALTER COLUMN `notification_status` SET DEFAULT 'PENDING';

CREATE UNIQUE INDEX `uq_contact_messages_reference` ON `contact_messages` (`reference_id`);
CREATE INDEX `idx_contact_messages_fingerprint`  ON `contact_messages` (`fingerprint`, `created_at`);
CREATE INDEX `idx_contact_messages_notification` ON `contact_messages` (`notification_status`, `created_at`);
CREATE INDEX `idx_contact_messages_created`      ON `contact_messages` (`created_at`);
