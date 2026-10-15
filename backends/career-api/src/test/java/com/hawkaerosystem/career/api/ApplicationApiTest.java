package com.hawkaerosystem.career.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hawkaerosystem.career.entity.DroneApplication;
import com.hawkaerosystem.career.entity.NotificationOutbox;
import com.hawkaerosystem.career.entity.NotificationStatus;
import com.hawkaerosystem.career.service.NotificationService;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mock.web.MockMultipartFile;

class ApplicationApiTest extends AbstractApiTest {

    @Autowired NotificationService notifications;

    @Test
    void validSubmissionIsPersistedStoredAndEmailed() throws Exception {
        mvc.perform(request(validFields(), cv(), licence()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CREATED"))
                .andExpect(jsonPath("$.applicationId").isNumber())
                .andExpect(jsonPath("$.emailNotification").value("SENT"));

        List<DroneApplication> rows = applications.findAll();
        assertEquals(1, rows.size());
        DroneApplication a = rows.get(0);
        assertEquals("pilot@example.com", a.getEmail());
        assertEquals("9876543210", a.getPhone());
        assertEquals("+91", a.getPhoneCode());
        assertEquals("Not Provided", a.getExperienceInfo(), "empty optional textarea defaults like the PHP script");
        assertEquals("Not Provided", a.getOwnDroneInfo());
        assertTrue(a.getCvFile().startsWith("cv/") && a.getCvFile().endsWith(".pdf"));
        assertTrue(a.getLicenseFile().startsWith("license/") && a.getLicenseFile().endsWith(".png"));
        assertTrue(Files.exists(STORAGE.resolve(a.getCvFile())));
        assertTrue(Files.exists(STORAGE.resolve(a.getLicenseFile())));
        assertEquals(2, storedFileCount());

        // one company notification + one applicant confirmation
        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender, times(2)).send(sent.capture());
        assertEquals("admin@test.invalid", sent.getAllValues().get(0).getAllRecipients()[0].toString());
        assertEquals(1, sent.getAllValues().get(1).getAllRecipients().length);
        assertEquals("pilot@example.com", sent.getAllValues().get(1).getAllRecipients()[0].toString());
        NotificationOutbox n = outbox.findAll().get(0);
        assertEquals(NotificationStatus.SENT, n.getStatus());
        assertEquals(NotificationStatus.SENT, confirmationOutbox.findAll().get(0).getStatus());
    }

    @Test
    void licenceIsOptionalLikeTheOriginalForm() throws Exception {
        mvc.perform(request(validFields(), cv())).andExpect(status().isCreated());
        assertEquals("", applications.findAll().get(0).getLicenseFile());
    }

    @Test
    void duplicateEmailIsRejectedCaseInsensitively() throws Exception {
        mvc.perform(request(validFields(), cv())).andExpect(status().isCreated());

        Map<String, String> again = validFields();
        again.put("email", "PILOT@example.com");
        again.put("phone", "7000000001");
        mvc.perform(request(again, cv()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value("DUPLICATE"));

        assertEquals(1, applications.count());
        assertEquals(1, storedFileCount(), "files of the rejected duplicate must not be stored");
        verify(mailSender, times(2)).send(any(MimeMessage.class)); // first submission only: notification + confirmation
    }

    @Test
    void duplicatePhoneIsRejected() throws Exception {
        mvc.perform(request(validFields(), cv())).andExpect(status().isCreated());

        Map<String, String> again = validFields();
        again.put("email", "someone.else@example.com");
        mvc.perform(request(again, cv()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value("DUPLICATE"));
        assertEquals(1, applications.count());
    }

    @Test
    void missingFieldsReturnValidationErrors() throws Exception {
        mvc.perform(request(Map.of("fullName", "Test Pilot"), cv()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[?(@.field=='email')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='phone')]").exists());
        assertEquals(0, applications.count());
        assertEquals(0, storedFileCount());
    }

    @Test
    void invalidEmailAndPhoneUseFrontendMessages() throws Exception {
        Map<String, String> f = validFields();
        f.put("email", "a@b");
        mvc.perform(request(f, cv()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("Please enter a valid email address."));

        f = validFields();
        f.put("phone", "12ab");
        mvc.perform(request(f, cv()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("Phone number must be 7\u201315 digits and contain only numbers."));
    }

    @Test
    void missingCvIsRejected() throws Exception {
        mvc.perform(request(validFields()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("INVALID_UPLOAD"))
                .andExpect(jsonPath("$.errors[0].field").value("cvFile"));
        assertEquals(0, applications.count());
    }

    @Test
    void fakePdfIsRejectedAndNothingIsLeftBehind() throws Exception {
        MockMultipartFile fake = new MockMultipartFile("cvFile", "cv.pdf", "application/pdf",
                "<html>not a pdf</html>".getBytes(StandardCharsets.UTF_8));
        mvc.perform(request(validFields(), fake))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("INVALID_UPLOAD"));
        assertEquals(0, applications.count());
        assertEquals(0, storedFileCount());
    }

    @Test
    void invalidSecondFileRemovesTheAlreadyStoredFirstFile() throws Exception {
        MockMultipartFile badLicence = new MockMultipartFile("licenseFile", "licence.exe", "application/octet-stream", PNG);
        mvc.perform(request(validFields(), cv(), badLicence)).andExpect(status().isBadRequest());
        assertEquals(0, applications.count());
        assertEquals(0, storedFileCount(), "CV stored before the licence failed must be cleaned up");
    }

    @Test
    void oversizedFileIsRejectedWith413() throws Exception {
        byte[] big = new byte[5 * 1024 * 1024 + 1];
        System.arraycopy(PDF, 0, big, 0, PDF.length);
        mvc.perform(request(validFields(), new MockMultipartFile("cvFile", "cv.pdf", "application/pdf", big)))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.status").value("FILE_TOO_LARGE"));
        assertEquals(0, applications.count());
    }

    @Test
    void emailFailureKeepsTheApplicationAndSchedulesRetry() throws Exception {
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(MimeMessage.class));

        mvc.perform(request(validFields(), cv()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CREATED"))
                .andExpect(jsonPath("$.emailNotification").value("PENDING_RETRY"));

        assertEquals(1, applications.count(), "application must be stored even though the email failed");
        NotificationOutbox failed = outbox.findAll().get(0);
        assertEquals(NotificationStatus.FAILED, failed.getStatus());
        assertEquals(1, failed.getAttempts());

        // SMTP recovers; the retry path delivers the same notification.
        org.mockito.Mockito.reset(mailSender);
        org.mockito.Mockito.when(mailSender.createMimeMessage())
                .thenReturn(new MimeMessage(jakarta.mail.Session.getInstance(new java.util.Properties())));
        assertTrue(notifications.deliver(failed.getId()));
        assertEquals(NotificationStatus.SENT, outbox.findById(failed.getId()).orElseThrow().getStatus());
        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void nonMultipartRequestIsRejectedWithJson415() throws Exception {
        mvc.perform(post("/api/applications").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value("UNSUPPORTED_MEDIA_TYPE"));
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void candidateDataIsNotExposedOverHttp() throws Exception {
        mvc.perform(request(validFields(), cv())).andExpect(status().isCreated());
        mvc.perform(get("/api/applications")).andExpect(status().isMethodNotAllowed());
        mvc.perform(get("/api/applications/1")).andExpect(status().isNotFound());
        mvc.perform(get("/uploads/cv/x.pdf")).andExpect(status().isNotFound());
    }
}
