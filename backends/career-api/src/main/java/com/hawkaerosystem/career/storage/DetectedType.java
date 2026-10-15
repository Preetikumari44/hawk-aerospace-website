package com.hawkaerosystem.career.storage;

import java.util.Locale;
import java.util.Optional;

/** The document types the career form accepts, identified by their real content (see {@link FileSignature}). */
public enum DetectedType {
    PDF("pdf", "application/pdf"),
    JPEG("jpg", "image/jpeg"),
    PNG("png", "image/png"),
    WEBP("webp", "image/webp");

    private final String extension;
    private final String mimeType;

    DetectedType(String extension, String mimeType) {
        this.extension = extension;
        this.mimeType = mimeType;
    }

    /** Extension used for the stored file name (always lower case, without the dot). */
    public String extension() {
        return extension;
    }

    public String mimeType() {
        return mimeType;
    }

    /** Maps a client-supplied file extension (any case, with or without dot) to a type; "jpeg" and "jpg" are both JPEG. */
    public static Optional<DetectedType> fromExtension(String extension) {
        if (extension == null) {
            return Optional.empty();
        }
        String e = extension.trim().toLowerCase(Locale.ROOT);
        if (e.startsWith(".")) {
            e = e.substring(1);
        }
        return switch (e) {
            case "pdf" -> Optional.of(PDF);
            case "jpg", "jpeg" -> Optional.of(JPEG);
            case "png" -> Optional.of(PNG);
            case "webp" -> Optional.of(WEBP);
            default -> Optional.empty();
        };
    }

    /** MIME type for a storage key such as {@code cv/<uuid>.pdf}; unknown extensions fall back to octet-stream. */
    public static String mimeTypeForKey(String key) {
        if (key == null) {
            return "application/octet-stream";
        }
        int dot = key.lastIndexOf('.');
        if (dot < 0) {
            return "application/octet-stream";
        }
        return fromExtension(key.substring(dot + 1)).map(DetectedType::mimeType).orElse("application/octet-stream");
    }
}
