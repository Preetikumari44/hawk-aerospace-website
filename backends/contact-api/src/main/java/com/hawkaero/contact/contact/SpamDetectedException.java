package com.hawkaero.contact.contact;

public class SpamDetectedException extends RuntimeException {
    public SpamDetectedException() {
        super("Spam protection triggered");
    }
}
