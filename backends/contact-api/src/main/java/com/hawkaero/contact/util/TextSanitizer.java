package com.hawkaero.contact.util;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * Cleans untrusted text before it is validated, stored or put in an email.
 * Values are stored as plain text (NOT html-escaped); escaping happens where the
 * value is rendered (see EmailNotificationService), which is the safe order.
 */
public final class TextSanitizer {

    /** Control characters except tab / line feed. */
    private static final Pattern CONTROL = Pattern.compile("[\\p{Cc}&&[^\\t\\n]]");
    private static final Pattern MANY_BLANK_LINES = Pattern.compile("\\n{3,}");

    private TextSanitizer() {
    }

    /** Single-line field: no line breaks, collapsed whitespace, trimmed. */
    public static String singleLine(String value) {
        if (value == null) {
            return "";
        }
        String v = Normalizer.normalize(value, Normalizer.Form.NFC);
        v = CONTROL.matcher(v).replaceAll("");
        v = v.replaceAll("\\s+", " ");
        return v.trim();
    }

    /** Multi-line field (message): keeps line breaks, removes control characters. */
    public static String multiLine(String value) {
        if (value == null) {
            return "";
        }
        String v = Normalizer.normalize(value, Normalizer.Form.NFC);
        v = v.replace("\r\n", "\n").replace('\r', '\n');
        v = CONTROL.matcher(v).replaceAll("");
        v = MANY_BLANK_LINES.matcher(v).replaceAll("\n\n");
        return v.trim();
    }
}
