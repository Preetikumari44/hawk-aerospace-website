-- V2: additive columns only - existing rows and columns are untouched.
-- State of the confirmation e-mail sent to the applicant, kept separate from the admin notification state so a
-- retry of one e-mail never re-sends the other.
-- Rows that existed before this migration are marked SENT, so no confirmation is ever sent retroactively.
ALTER TABLE distributor_applications
    ADD COLUMN confirmation_status          VARCHAR(20)  NOT NULL DEFAULT 'SENT',
    ADD COLUMN confirmation_attempts        INT          NOT NULL DEFAULT 0,
    ADD COLUMN confirmation_last_attempt_at DATETIME(6)  NULL,
    ADD COLUMN confirmation_last_error      VARCHAR(500) NULL;

-- New rows start as PENDING; the application always sets the value explicitly.
ALTER TABLE distributor_applications ALTER COLUMN confirmation_status SET DEFAULT 'PENDING';

ALTER TABLE distributor_applications
    ADD CONSTRAINT ck_distributor_applications_confirmation_status
        CHECK (confirmation_status IN ('PENDING', 'SENT', 'FAILED'));

CREATE INDEX ix_distributor_applications_confirmation_pending
    ON distributor_applications (confirmation_status, submitted_at);
