-- V3: additive columns only - existing rows and columns are untouched.
-- State of the confirmation e-mail sent to the visitor (kept separate from the company notification
-- state, so a retry of one e-mail never re-sends the other).
-- Rows that existed before this migration are marked SENT, so no confirmation is ever sent retroactively.
ALTER TABLE `contact_messages`
  ADD COLUMN `confirmation_status`     VARCHAR(16)       NOT NULL DEFAULT 'SENT',
  ADD COLUMN `confirmation_attempts`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN `confirmed_at`            DATETIME          NULL,
  ADD COLUMN `last_confirmation_error` VARCHAR(255)      NULL;

-- New rows start as PENDING; the application always sets the value explicitly.
ALTER TABLE `contact_messages` ALTER COLUMN `confirmation_status` SET DEFAULT 'PENDING';

CREATE INDEX `idx_contact_messages_confirmation` ON `contact_messages` (`confirmation_status`, `created_at`);
