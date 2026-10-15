package com.hawkaerosystem.career.exception;

/** Server-side storage problem (disk full, permissions...). Never caused by client input. */
public class StorageException extends RuntimeException {
    public StorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
