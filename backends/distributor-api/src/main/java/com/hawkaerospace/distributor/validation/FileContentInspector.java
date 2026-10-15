package com.hawkaerospace.distributor.validation;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Validates an upload by extension, size AND actual content (magic bytes / container structure).
 * JDK-only on purpose so it is trivial to unit-test. It never decompresses anything, so zip bombs cannot hurt it.
 */
public final class FileContentInspector {

    /** Accepted extensions (same list as the frontend FILE_RULES.extensions) and the content type we record. */
    public static final Map<String, String> CONTENT_TYPES = Map.ofEntries(
            Map.entry("pdf", "application/pdf"),
            Map.entry("doc", "application/msword"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("ppt", "application/vnd.ms-powerpoint"),
            Map.entry("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            Map.entry("xls", "application/vnd.ms-excel"),
            Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            Map.entry("png", "image/png"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"));

    public record Result(String extension, String contentType) {}

    private static final int MAX_ZIP_ENTRIES = 100_000;
    private static final byte[] OLE2 = {
        (byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1
    };
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};

    private FileContentInspector() {}

    /** Lower-case extension of an untrusted filename, or empty string. Only used to pick a whitelist entry. */
    public static String extensionOf(String originalFilename) {
        if (originalFilename == null) return "";
        int slash = Math.max(originalFilename.lastIndexOf('/'), originalFilename.lastIndexOf('\\'));
        String base = originalFilename.substring(slash + 1);
        int dot = base.lastIndexOf('.');
        if (dot < 0 || dot == base.length() - 1) return "";
        return base.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    public static Result inspect(String originalFilename, byte[] data, long maxBytes) {
        String ext = extensionOf(originalFilename);
        String contentType = CONTENT_TYPES.get(ext);
        if (contentType == null) {
            throw new InvalidUploadException(
                    InvalidUploadException.UNSUPPORTED_TYPE,
                    "This file type is not supported. Use PDF, Word, PowerPoint, Excel or image (PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, PNG, JPG, JPEG).");
        }
        if (data == null || data.length == 0) {
            throw new InvalidUploadException(InvalidUploadException.UNREADABLE, "The uploaded file is empty.");
        }
        if (data.length > maxBytes) {
            throw new InvalidUploadException(
                    InvalidUploadException.TOO_LARGE,
                    "The uploaded file is larger than the maximum of " + (maxBytes / (1024 * 1024)) + " MB.");
        }

        boolean ok =
                switch (ext) {
                    case "pdf" -> looksLikePdf(data);
                    case "png" -> startsWith(data, PNG);
                    case "jpg", "jpeg" -> data.length > 3
                            && (data[0] & 0xFF) == 0xFF
                            && (data[1] & 0xFF) == 0xD8
                            && (data[2] & 0xFF) == 0xFF;
                    case "doc" -> startsWith(data, OLE2) && containsUtf16(data, "WordDocument");
                    case "xls" -> startsWith(data, OLE2)
                            && (containsUtf16(data, "Workbook") || containsUtf16(data, "Book"));
                    case "ppt" -> startsWith(data, OLE2) && containsUtf16(data, "PowerPoint Document");
                    case "docx" -> isOoxml(data, "word/");
                    case "xlsx" -> isOoxml(data, "xl/");
                    case "pptx" -> isOoxml(data, "ppt/");
                    default -> false;
                };
        if (!ok) {
            throw new InvalidUploadException(
                    InvalidUploadException.CONTENT_MISMATCH,
                    "The file content does not match its ." + ext + " extension.");
        }
        return new Result(ext, contentType);
    }

    private static boolean looksLikePdf(byte[] d) {
        byte[] sig = "%PDF-".getBytes(StandardCharsets.US_ASCII);
        int limit = Math.min(d.length - sig.length, 1024);
        for (int i = 0; i <= limit; i++) {
            if (matchesAt(d, sig, i)) return true;
        }
        return false;
    }

    private static boolean startsWith(byte[] d, byte[] sig) {
        return d.length >= sig.length && matchesAt(d, sig, 0);
    }

    private static boolean matchesAt(byte[] d, byte[] sig, int off) {
        if (off < 0 || off + sig.length > d.length) return false;
        for (int i = 0; i < sig.length; i++) {
            if (d[off + i] != sig[i]) return false;
        }
        return true;
    }

    /** OLE2 directory entries store stream names as UTF-16LE. */
    private static boolean containsUtf16(byte[] d, String name) {
        byte[] needle = name.getBytes(StandardCharsets.UTF_16LE);
        for (int i = 0; i <= d.length - needle.length; i++) {
            if (d[i] == needle[0] && matchesAt(d, needle, i)) return true;
        }
        return false;
    }

    /** Reads only the ZIP central directory (file names), never the compressed data. */
    private static boolean isOoxml(byte[] d, String requiredDirPrefix) {
        if (d.length < 22 || d[0] != 'P' || d[1] != 'K' || d[2] != 3 || d[3] != 4) return false;
        List<String> names = zipEntryNames(d);
        if (names == null) return false;
        boolean contentTypes = names.contains("[Content_Types].xml");
        boolean dir = names.stream().anyMatch(n -> n.startsWith(requiredDirPrefix));
        return contentTypes && dir;
    }

    private static List<String> zipEntryNames(byte[] d) {
        ByteBuffer buf = ByteBuffer.wrap(d).order(ByteOrder.LITTLE_ENDIAN);
        int eocd = -1;
        for (int i = d.length - 22; i >= Math.max(0, d.length - 22 - 65_535); i--) {
            if (buf.getInt(i) == 0x06054b50) {
                eocd = i;
                break;
            }
        }
        if (eocd < 0) return null;
        int total = Short.toUnsignedInt(buf.getShort(eocd + 10));
        long cdOffset = Integer.toUnsignedLong(buf.getInt(eocd + 16));
        if (total > MAX_ZIP_ENTRIES || cdOffset >= d.length) return null;

        java.util.ArrayList<String> names = new java.util.ArrayList<>();
        int pos = (int) cdOffset;
        for (int n = 0; n < total; n++) {
            if (pos + 46 > d.length || buf.getInt(pos) != 0x02014b50) return null;
            int nameLen = Short.toUnsignedInt(buf.getShort(pos + 28));
            int extraLen = Short.toUnsignedInt(buf.getShort(pos + 30));
            int commentLen = Short.toUnsignedInt(buf.getShort(pos + 32));
            int nameStart = pos + 46;
            if (nameStart + nameLen > d.length) return null;
            names.add(new String(d, nameStart, nameLen, StandardCharsets.UTF_8));
            pos = nameStart + nameLen + extraLen + commentLen;
        }
        return names;
    }
}
