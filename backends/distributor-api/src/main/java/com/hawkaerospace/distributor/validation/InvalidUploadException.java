package com.hawkaerospace.distributor.validation;

/** The uploaded document is not acceptable. {@code code} is a stable machine-readable reason. */
public class InvalidUploadException extends RuntimeException {

    public static final String TOO_LARGE = "FILE_TOO_LARGE";
    public static final String UNSUPPORTED_TYPE = "UNSUPPORTED_FILE_TYPE";
    public static final String CONTENT_MISMATCH = "FILE_CONTENT_MISMATCH";
    public static final String UNREADABLE = "FILE_UNREADABLE";

    private final String code;

    public InvalidUploadException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
