package com.hawkaero.contact.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Type-safe view of the {@code app.*} settings in application.yml. */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @DefaultValue Cors cors,
        @DefaultValue Duplicate duplicate,
        @DefaultValue RateLimit rateLimit,
        @DefaultValue Request request,
        @DefaultValue Mail mail,
        @DefaultValue Notification notification) {

    public record Cors(@DefaultValue("http://localhost:3000") List<String> allowedOrigins) {
    }

    /** Submissions with an identical fingerprint inside this window are rejected as duplicates. */
    public record Duplicate(@DefaultValue("10") int windowMinutes) {
    }

    public record RateLimit(
            @DefaultValue("5") int maxRequests,
            @DefaultValue("600") int windowSeconds,
            @DefaultValue("false") boolean trustForwardedHeaders) {
    }

    public record Request(@DefaultValue("32768") long maxBodyBytes) {
    }

    public record Mail(
            @DefaultValue("") String host,
            @DefaultValue("") String recipient,
            @DefaultValue("form@hawkaerosystem.co.uk") String from,
            @DefaultValue("Website Contact Form") String fromName) {
    }

    public record Notification(
            @DefaultValue("true") boolean retryEnabled,
            @DefaultValue("5") int maxAttempts,
            @DefaultValue("300000") long retryDelayMs) {
    }
}
