package com.hawkaerosystem.career.exception;

public class DuplicateApplicationException extends RuntimeException {
    public DuplicateApplicationException() {
        super("You are already registered. Our team will contact you soon.");
    }
}
