package com.hawkaerospace.distributor.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

/** Consistent failure body. {@code success} and {@code message} are what the frontend reads. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        boolean success, String message, String code, int status, List<FieldError> errors, Instant timestamp) {

    public record FieldError(String field, String message) {}

    public static ApiError of(int status, String code, String message) {
        return new ApiError(false, message, code, status, null, Instant.now());
    }

    public static ApiError of(int status, String code, String message, List<FieldError> errors) {
        return new ApiError(false, message, code, status, errors, Instant.now());
    }
}
