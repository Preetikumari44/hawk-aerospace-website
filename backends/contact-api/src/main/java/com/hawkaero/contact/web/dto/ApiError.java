package com.hawkaero.contact.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Map;

/** Error body used for every non-2xx response. Never contains stack traces or internals. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        boolean success,
        String code,
        String message,
        Map<String, String> fieldErrors,
        Instant timestamp) {

    public static ApiError of(String code, String message) {
        return new ApiError(false, code, message, null, Instant.now());
    }

    public static ApiError of(String code, String message, Map<String, String> fieldErrors) {
        return new ApiError(false, code, message, fieldErrors, Instant.now());
    }
}
