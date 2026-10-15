package com.hawkaero.contact.contact;

import java.util.Map;

/** Business-rule validation failure (e.g. value not in the allowed dropdown list). */
public class RequestValidationException extends RuntimeException {

    private final Map<String, String> fieldErrors;

    public RequestValidationException(Map<String, String> fieldErrors) {
        super("Validation failed");
        this.fieldErrors = Map.copyOf(fieldErrors);
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}
