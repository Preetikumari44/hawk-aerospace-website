package com.hawkaerosystem.career.entity;

public enum NotificationStatus {
    /** Created together with the application; the first send attempt has not finished yet. */
    PENDING,
    /** Accepted by the SMTP server. */
    SENT,
    /** Last attempt failed; will be retried until {@code app.notification.max-attempts}. */
    FAILED,
    /** Retries exhausted; needs manual attention (see ERROR log lines). */
    GAVE_UP
}
