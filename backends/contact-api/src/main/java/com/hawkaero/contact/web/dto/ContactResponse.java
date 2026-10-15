package com.hawkaero.contact.web.dto;

/** 201 Created body. {@code message} is the same text the original PHP endpoint returned. */
public record ContactResponse(boolean success, String message, String referenceId) {

    public static ContactResponse created(String referenceId) {
        return new ContactResponse(true, "Message submitted successfully!", referenceId);
    }
}
