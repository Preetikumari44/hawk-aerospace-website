package com.hawkaerosystem.career.config;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

/** Typed view of the {@code app.*} configuration. Every value comes from application.yml / environment variables. */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Storage storage, Upload upload, Mail mail, Notification notification, Cors cors) {

    public record Storage(String root) {}

    public record Upload(DataSize maxFileSize, boolean requireLicenseWhenLicensed) {}

    public record Mail(String from, String fromName, String adminTo) {}

    public record Notification(int maxAttempts, Duration retryInterval, Duration retryInitialDelay, int retryBatchSize) {}

    public record Cors(List<String> allowedOrigins) {}
}
