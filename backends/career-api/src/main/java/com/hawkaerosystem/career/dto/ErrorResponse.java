package com.hawkaerosystem.career.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** Uniform error body: {@code status} is a stable machine-readable code, {@code message} is safe to show to users. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(String status, String message, List<FieldErrorDto> errors) {

    public static ErrorResponse of(String status, String message) {
        return new ErrorResponse(status, message, null);
    }
}
