package com.hawkaerospace.distributor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.hawkaerospace.distributor.validation.FileContentInspector;
import com.hawkaerospace.distributor.validation.InvalidUploadException;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;

class FileContentInspectorTest {

    static final long MAX = 10L * 1024 * 1024;

    static byte[] zip(String... entries) throws Exception {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (ZipOutputStream z = new ZipOutputStream(bos)) {
            for (String e : entries) {
                z.putNextEntry(new ZipEntry(e));
                z.write("<x/>".getBytes(StandardCharsets.UTF_8));
                z.closeEntry();
            }
        }
        return bos.toByteArray();
    }

    static byte[] ole2(String streamName) {
        byte[] sig = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};
        byte[] name = streamName.getBytes(StandardCharsets.UTF_16LE);
        byte[] out = new byte[sig.length + 600 + name.length];
        System.arraycopy(sig, 0, out, 0, sig.length);
        System.arraycopy(name, 0, out, sig.length + 600, name.length);
        return out;
    }

    static InvalidUploadException reject(String filename, byte[] data) {
        return assertThrows(InvalidUploadException.class, () -> FileContentInspector.inspect(filename, data, MAX));
    }

    @Test
    void acceptsRealPdfPngJpeg() {
        assertEquals("application/pdf", FileContentInspector.inspect("a.PDF", "%PDF-1.7\n...".getBytes(StandardCharsets.US_ASCII), MAX).contentType());
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0};
        assertEquals("image/png", FileContentInspector.inspect("a.png", png, MAX).contentType());
        byte[] jpg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0};
        assertEquals("image/jpeg", FileContentInspector.inspect("a.jpeg", jpg, MAX).contentType());
        assertEquals("image/jpeg", FileContentInspector.inspect("a.jpg", jpg, MAX).contentType());
    }

    @Test
    void acceptsOoxmlAndLegacyOffice() throws Exception {
        FileContentInspector.inspect("a.docx", zip("[Content_Types].xml", "word/document.xml"), MAX);
        FileContentInspector.inspect("a.xlsx", zip("[Content_Types].xml", "xl/workbook.xml"), MAX);
        FileContentInspector.inspect("a.pptx", zip("[Content_Types].xml", "ppt/presentation.xml"), MAX);
        FileContentInspector.inspect("a.doc", ole2("WordDocument"), MAX);
        FileContentInspector.inspect("a.xls", ole2("Workbook"), MAX);
        FileContentInspector.inspect("a.ppt", ole2("PowerPoint Document"), MAX);
    }

    @Test
    void rejectsUnsupportedExtensions() {
        assertEquals(InvalidUploadException.UNSUPPORTED_TYPE, reject("virus.exe", new byte[] {'M', 'Z', 1}).code());
        assertEquals(InvalidUploadException.UNSUPPORTED_TYPE, reject("noextension", new byte[] {1}).code());
        assertEquals(InvalidUploadException.UNSUPPORTED_TYPE, reject("a.pdf.exe", new byte[] {1}).code());
        assertEquals(InvalidUploadException.UNSUPPORTED_TYPE, reject("a.svg", "<svg/>".getBytes()).code());
    }

    @Test
    void rejectsContentThatDoesNotMatchExtension() throws Exception {
        assertEquals(InvalidUploadException.CONTENT_MISMATCH, reject("fake.pdf", "just text".getBytes()).code());
        assertEquals(InvalidUploadException.CONTENT_MISMATCH, reject("fake.png", "%PDF-1.4".getBytes()).code());
        assertEquals(InvalidUploadException.CONTENT_MISMATCH, reject("fake.docx", zip("[Content_Types].xml", "xl/workbook.xml")).code());
        assertEquals(InvalidUploadException.CONTENT_MISMATCH, reject("fake.docx", zip("word/document.xml")).code());
        assertEquals(InvalidUploadException.CONTENT_MISMATCH, reject("fake.doc", ole2("Workbook")).code());
        assertEquals(InvalidUploadException.CONTENT_MISMATCH, reject("fake.xlsx", new byte[] {'P', 'K', 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}).code());
    }

    @Test
    void rejectsEmptyAndOversized() {
        assertEquals(InvalidUploadException.UNREADABLE, reject("a.pdf", new byte[0]).code());
        byte[] big = new byte[(int) MAX + 1];
        System.arraycopy("%PDF-".getBytes(), 0, big, 0, 5);
        assertEquals(InvalidUploadException.TOO_LARGE, reject("a.pdf", big).code());
        byte[] exact = new byte[(int) MAX];
        System.arraycopy("%PDF-".getBytes(), 0, exact, 0, 5);
        FileContentInspector.inspect("a.pdf", exact, MAX); // exactly 10 MB is allowed
    }

    @Test
    void extensionIgnoresPathsAndCase() {
        assertEquals("pdf", FileContentInspector.extensionOf("..\\..\\evil/Report.Final.PDF"));
        assertEquals("", FileContentInspector.extensionOf("trailingdot."));
        assertEquals("", FileContentInspector.extensionOf(null));
    }
}
