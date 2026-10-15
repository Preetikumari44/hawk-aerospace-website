package com.hawkaero.contact.contact;

public enum NotificationStatus {
    /** Saved, administrator email not delivered yet (first attempt pending or queued for retry). */
    PENDING,
    SENT,
    /** Last attempt failed; the retry job will try again until max attempts is reached. */
    FAILED
}
