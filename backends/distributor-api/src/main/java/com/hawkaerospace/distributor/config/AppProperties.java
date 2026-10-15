package com.hawkaerospace.distributor.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Typed, validated application settings. The application refuses to start if a required one is missing. */
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @Valid @NotNull Cors cors,
        @Valid @NotNull Storage storage,
        @Valid @NotNull Upload upload,
        @Valid @NotNull Mail mail,
        @Valid @NotNull Notification notification,
        @Valid @NotNull RateLimit rateLimit,
        @Min(0) long duplicateWindowSeconds,
        @Valid @NotNull Admin admin) {

    public record Cors(@NotEmpty List<@NotBlank String> allowedOrigins) {
        public Cors {
            if (allowedOrigins != null) {
                allowedOrigins = allowedOrigins.stream().map(String::trim).toList();
                if (allowedOrigins.stream().anyMatch(o -> o.contains("*"))) {
                    throw new IllegalArgumentException(
                            "app.cors.allowed-origins must list exact origins; wildcards are not allowed");
                }
            }
        }
    }

    public record Storage(@NotBlank String root) {}

    public record Upload(@Min(1) long maxBytes) {}

    public record Mail(@NotBlank String from, @NotBlank String adminTo, boolean attachDocument) {}

    public record Notification(boolean retryEnabled, @Min(1000) long retryIntervalMs, @Min(1) int maxAttempts) {}

    public record RateLimit(@Min(1) int maxRequests, @Min(1) long windowSeconds) {}

    public record Admin(@NotBlank String username, String passwordHash) {}
}
