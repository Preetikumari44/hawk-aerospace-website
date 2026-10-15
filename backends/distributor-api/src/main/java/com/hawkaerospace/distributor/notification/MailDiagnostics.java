package com.hawkaerospace.distributor.notification;

import java.util.regex.Pattern;

/**
 * Builds a short, safe description of a mail failure for logs and the stored "last error" column:
 * the exception chain (class names, outermost first) plus the ROOT cause's message with e-mail addresses
 * and anything that looks like a credential removed. Never includes message bodies or attachments.
 */
final class MailDiagnostics {

    private static final Pattern EMAIL = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+");
    private static final Pattern SECRET = Pattern.compile("(?i)(pass(word)?|token|secret|auth)\\s*[=:]\\s*\\S+");

    private MailDiagnostics() {
    }

    static String describe(Throwable error, int maxLength) {
        StringBuilder chain = new StringBuilder();
        Throwable root = error;
        int depth = 0;
        for (Throwable t = error; t != null && depth < 6; t = t.getCause(), depth++) {
            if (chain.length() > 0) {
                chain.append(" <- ");
            }
            chain.append(t.getClass().getSimpleName());
            root = t;
            if (t.getCause() == t) {
                break;
            }
        }
        String message = root.getMessage();
        if (message != null && !message.isBlank()) {
            String safe = EMAIL.matcher(message).replaceAll("<email>");
            safe = SECRET.matcher(safe).replaceAll("$1=<hidden>");
            safe = safe.replaceAll("[\\p{Cntrl}]+", " ").trim();
            if (safe.length() > 160) {
                safe = safe.substring(0, 160);
            }
            chain.append(": ").append(safe);
        }
        String out = chain.toString();
        return out.length() > maxLength ? out.substring(0, maxLength) : out;
    }
}
