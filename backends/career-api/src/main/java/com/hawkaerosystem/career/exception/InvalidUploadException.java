package com.hawkaerosystem.career.exception;

public class InvalidUploadException extends RuntimeException {
    private final String field;

    public InvalidUploadException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() { return field; }
}
