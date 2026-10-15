package com.hawkaerosystem.career.storage;

import java.util.Optional;

/** Identifies a document by its leading bytes ("magic numbers"), so a renamed .exe or HTML file is never accepted. */
public final class FileSignature {

    /** Number of leading bytes needed by {@link #detect(byte[], int)}. */
    public static final int HEADER_LENGTH = 16;

    private FileSignature() {
    }

    public static Optional<DetectedType> detect(byte[] header, int length) {
        if (header == null) {
            return Optional.empty();
        }
        int n = Math.min(length, header.length);
        if (n >= 5 && header[0] == '%' && header[1] == 'P' && header[2] == 'D' && header[3] == 'F' && header[4] == '-') {
            return Optional.of(DetectedType.PDF);
        }
        if (n >= 3 && (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            return Optional.of(DetectedType.JPEG);
        }
        if (n >= 8 && (header[0] & 0xFF) == 0x89 && header[1] == 'P' && header[2] == 'N' && header[3] == 'G'
                && header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A) {
            return Optional.of(DetectedType.PNG);
        }
        if (n >= 12 && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
            return Optional.of(DetectedType.WEBP);
        }
        return Optional.empty();
    }
}
