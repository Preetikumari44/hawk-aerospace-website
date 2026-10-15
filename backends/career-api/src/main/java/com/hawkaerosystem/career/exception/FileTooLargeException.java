package com.hawkaerosystem.career.exception;

public class FileTooLargeException extends InvalidUploadException {
    public FileTooLargeException(String field, String message) {
        super(field, message);
    }
}
