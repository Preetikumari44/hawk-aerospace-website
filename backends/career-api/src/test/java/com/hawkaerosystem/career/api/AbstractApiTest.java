package com.hawkaerosystem.career.api;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import com.hawkaerosystem.career.repository.ConfirmationOutboxRepository;
import com.hawkaerosystem.career.repository.DroneApplicationRepository;
import com.hawkaerosystem.career.repository.NotificationOutboxRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

/**
 * Shared setup: isolated in-memory H2 database (profile "test"), a temporary storage directory and a mocked SMTP
 * sender. Nothing here can touch the production database, filesystem or mail server.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
abstract class AbstractApiTest {

    static final Path STORAGE = createStorage();

    private static Path createStorage() {
        try {
            return Files.createTempDirectory("hawk-career-test-");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("app.storage.root", STORAGE::toString);
    }

    static final byte[] PDF = "%PDF-1.4\n%test cv\n".getBytes(StandardCharsets.US_ASCII);
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 1, 2, 3};

    @Autowired MockMvc mvc;
    @Autowired DroneApplicationRepository applications;
    @Autowired NotificationOutboxRepository outbox;
    @Autowired ConfirmationOutboxRepository confirmationOutbox;

    @MockitoBean JavaMailSender mailSender;

    @BeforeEach
    void cleanState() throws IOException {
        confirmationOutbox.deleteAll();
        outbox.deleteAll();
        applications.deleteAll();
        try (Stream<Path> walk = Files.walk(STORAGE)) {
            walk.sorted(Comparator.reverseOrder()).filter(p -> !p.equals(STORAGE)).forEach(p -> p.toFile().delete());
        }
        when(mailSender.createMimeMessage()).thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
    }

    long storedFileCount() throws IOException {
        try (Stream<Path> walk = Files.walk(STORAGE)) {
            return walk.filter(Files::isRegularFile).count();
        }
    }

    /** The exact fields the Next.js form posts (including the empty optional textareas). */
    static Map<String, String> validFields() {
        Map<String, String> f = new LinkedHashMap<>();
        f.put("fullName", "Test Pilot");
        f.put("email", "pilot@example.com");
        f.put("country", "+91");
        f.put("phoneCode", "+91");
        f.put("phone", "9876543210");
        f.put("residency", "yes");
        f.put("hasExperience", "yes");
        f.put("experienceInfo", "");
        f.put("ownDrone", "no");
        f.put("ownDroneInfo", "");
        f.put("willingTravel", "yes");
        f.put("visaInvestment", "no");
        f.put("hasLicense", "yes");
        return f;
    }

    static MockMultipartHttpServletRequestBuilder request(Map<String, String> fields, MockMultipartFile... files) {
        MockMultipartHttpServletRequestBuilder builder = multipart("/api/applications");
        for (MockMultipartFile file : files) {
            builder.file(file);
        }
        fields.forEach(builder::param);
        return builder;
    }

    static MockMultipartFile cv() {
        return new MockMultipartFile("cvFile", "cv.pdf", "application/pdf", PDF);
    }

    static MockMultipartFile licence() {
        return new MockMultipartFile("licenseFile", "licence.png", "image/png", PNG);
    }
}
