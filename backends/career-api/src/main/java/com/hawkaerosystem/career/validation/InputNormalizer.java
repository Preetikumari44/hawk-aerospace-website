package com.hawkaerosystem.career.validation;

import java.util.Locale;

/** Pure normalisation helpers (no Spring dependencies) so they are trivially unit-testable. */
public final class InputNormalizer {

    private InputNormalizer() {}

    public static String text(String value) {
        return value == null ? null : value.strip();
    }

    /** Trim and lower-case; email comparison is case-insensitive. */
    public static String email(String value) {
        return value == null ? null : value.strip().toLowerCase(Locale.ROOT);
    }

    /**
     * Removes the separators users commonly type (spaces, dashes, dots, parentheses) from a national phone number.
     * The result is still validated against {@code ^[0-9]{7,15}$}, i.e. the original frontend rule.
     */
    public static String phone(String value) {
        return value == null ? null : value.replaceAll("[\\s\\-().]", "");
    }

    /** "+91", " + 91 " -> "+91". */
    public static String phoneCode(String value) {
        return value == null ? null : value.replaceAll("\\s", "");
    }

    public static String yesNo(String value) {
        return value == null ? null : value.strip().toLowerCase(Locale.ROOT);
    }

    /** Collapses control characters (CR/LF etc.) into spaces; used for values placed into email headers/subjects. */
    public static String singleLine(String value) {
        if (value == null) return "";
        return value.replaceAll("[\\p{Cntrl}]+", " ").strip();
    }
}
