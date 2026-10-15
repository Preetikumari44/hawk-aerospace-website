package com.hawkaerosystem.career.dto;

/**
 * Body of a successful {@code 201 Created}. {@code emailNotification} is {@code SENT} when the admin email was
 * delivered to the SMTP server, or {@code PENDING_RETRY} when it failed and will be retried automatically.
 * Either way the application itself is stored.
 */
public record ApplicationResponse(String status, long applicationId, String message, String emailNotification) {

    public static final String CREATED = "CREATED";
    public static final String EMAIL_SENT = "SENT";
    public static final String EMAIL_PENDING_RETRY = "PENDING_RETRY";
}
