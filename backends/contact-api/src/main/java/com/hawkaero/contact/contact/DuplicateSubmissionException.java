package com.hawkaero.contact.contact;

public class DuplicateSubmissionException extends RuntimeException {
    public DuplicateSubmissionException() {
        super("Duplicate submission");
    }
}
