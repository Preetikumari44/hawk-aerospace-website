package com.hawkaerospace.distributor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hawkaerospace.distributor.domain.DistributorApplication;
import com.hawkaerospace.distributor.domain.NotificationStatus;
import com.hawkaerospace.distributor.repository.DistributorApplicationRepository;
import com.hawkaerospace.distributor.service.ApplicationPersistenceService;
import jakarta.mail.internet.MimeMessage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

class DistributorApplicationApiTest extends AbstractMysqlIntegrationTest {

    static final String URL = "/api/distributor/applications";
    static final byte[] PDF = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n".getBytes();

    @Autowired MockMvc mvc;
    @Autowired DistributorApplicationRepository repository;
    @MockitoBean JavaMailSender mailSender;
    @MockitoSpyBean ApplicationPersistenceService persistence;

    @BeforeEach
    void setUp() throws Exception {
        reset(mailSender, persistence);
        when(mailSender.createMimeMessage()).thenAnswer(i -> new MimeMessage((jakarta.mail.Session) null));
        repository.deleteAll();
    }

    static MockMultipartHttpServletRequestBuilder valid(String company) {
        return (MockMultipartHttpServletRequestBuilder) multipart(URL)
                .param("country", "India").param("city", "Bengaluru")
                .param("models[]", "H32X (10L)", "H120 (50L)")
                .param("companyName", company).param("website", "www.acme.com")
                .param("businessType", "Drone Dealer").param("turnover", "\u20ac1m - \u20ac5m")
                .param("name", "Asha Rao").param("jobTitle", "Director").param("email", "asha@acme.com")
                .param("countryCode", "+91").param("phone", "98765 43210")
                .param("brands", "DJI").param("message", "Hello");
    }

    @Test
    void validSubmissionWithFileIsPersistedStoredAndNotified() throws Exception {
        mvc.perform(valid("Acme Agro").file(new MockMultipartFile("file", "../../etc/Company Profile.pdf", "application/pdf", PDF)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Your distributor application was submitted successfully."))
                .andExpect(jsonPath("$.notificationStatus").value("SENT"));

        List<DistributorApplication> all = repository.findAll();
        assertThat(all).hasSize(1);
        DistributorApplication a = repository.findWithModelsById(all.get(0).getId()).orElseThrow();
        assertThat(a.getModels()).containsExactly("H32X (10L)", "H120 (50L)");
        assertThat(a.getCompanyName()).isEqualTo("Acme Agro");
        assertThat(a.getTurnover()).isEqualTo("\u20ac1m - \u20ac5m");
        assertThat(a.getCountryCode()).isEqualTo("+91");
        assertThat(a.getStatus().name()).isEqualTo("NEW");
        assertThat(a.getSubmittedAt()).isNotNull();
        assertThat(a.getNotificationStatus()).isEqualTo(NotificationStatus.SENT);

        // safe server-side name; the client's path was ignored
        assertThat(a.getDocumentRef()).matches("\\d{4}/\\d{2}/[0-9a-f-]{36}\\.pdf").doesNotContain("..").doesNotContain("Company");
        Path stored = AbstractMysqlIntegrationTest.STORAGE.resolve(a.getDocumentRef());
        assertThat(Files.readAllBytes(stored)).isEqualTo(PDF);
        // one company notification + one applicant confirmation
        verify(mailSender, times(2)).send(any(MimeMessage.class));
        assertThat(a.getConfirmationStatus()).isEqualTo(NotificationStatus.SENT);
    }

    @Test
    void submissionWithoutFileOrModelsIsAccepted() throws Exception {
        mvc.perform(multipart(URL).param("country", "France").param("city", "Lyon").param("companyName", "Agri SA")
                        .param("businessType", "Farmer").param("turnover", "Under \u20ac1m").param("name", "Luc")
                        .param("email", "luc@agri.fr").param("countryCode", "+33").param("phone", "612345678"))
                .andExpect(status().isCreated());
        DistributorApplication a = repository.findWithModelsById(repository.findAll().get(0).getId()).orElseThrow();
        assertThat(a.getModels()).isEmpty();
        assertThat(a.getDocumentRef()).isNull();
    }

    @Test
    void invalidFieldsAreRejectedWithFieldErrorsAndNothingIsSaved() throws Exception {
        mvc.perform(multipart(URL).param("country", "Atlantis").param("email", "bad"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors[?(@.field=='country')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='city')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='companyName')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='name')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='email')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='phone')]").exists());
        assertThat(repository.count()).isZero();
    }

    @Test
    void badFilesAreRejectedAndNotStored() throws Exception {
        mvc.perform(valid("A").file(new MockMultipartFile("file", "run.exe", "application/octet-stream", new byte[] {'M', 'Z', 1})))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("UNSUPPORTED_FILE_TYPE"));
        mvc.perform(valid("A").file(new MockMultipartFile("file", "fake.pdf", "application/pdf", "not a pdf".getBytes())))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("FILE_CONTENT_MISMATCH"));
        byte[] big = new byte[10 * 1024 * 1024 + 1];
        System.arraycopy(PDF, 0, big, 0, PDF.length);
        mvc.perform(valid("A").file(new MockMultipartFile("file", "big.pdf", "application/pdf", big)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("FILE_TOO_LARGE"));
        assertThat(repository.count()).isZero();
    }

    @Test
    void emailFailureAfterSaveStillReturnsSavedWithWarning() throws Exception {
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(MimeMessage.class));
        mvc.perform(valid("Acme"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.notificationStatus").value("FAILED"))
                .andExpect(jsonPath("$.warning").value("NOTIFICATION_NOT_DELIVERED"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("saved")));
        DistributorApplication a = repository.findAll().get(0);
        assertThat(a.getNotificationStatus()).isEqualTo(NotificationStatus.FAILED);
        assertThat(a.getNotificationAttempts()).isEqualTo(1);
        assertThat(a.getConfirmationStatus()).isEqualTo(NotificationStatus.FAILED);
    }

    @Test
    void databaseFailureNeverReportsSuccessAndLeavesNoFile() throws Exception {
        doThrow(new DataAccessResourceFailureException("db down")).when(persistence).save(any());
        long filesBefore = countFiles();
        mvc.perform(valid("Acme").file(new MockMultipartFile("file", "p.pdf", "application/pdf", PDF)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false));
        assertThat(repository.count()).isZero();
        assertThat(countFiles()).isEqualTo(filesBefore);
        verify(mailSender, times(0)).send(any(MimeMessage.class));
    }

    @Test
    void identicalDoubleSubmitIsCollapsedButDifferentApplicationsAreNot() throws Exception {
        mvc.perform(valid("Acme")).andExpect(status().isCreated());
        mvc.perform(valid("Acme")).andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        assertThat(repository.count()).isEqualTo(1);
        mvc.perform(valid("Another Company")).andExpect(status().isCreated());
        assertThat(repository.count()).isEqualTo(2);
        verify(mailSender, times(4)).send(any(MimeMessage.class)); // 2 stored applications x (notification + confirmation)
    }

    @Test
    void thereIsNoPublicReadAndAdminNeedsCredentials() throws Exception {
        mvc.perform(valid("Acme")).andExpect(status().isCreated());
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/distributor/applications")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/distributor/applications").with(httpBasic("admin", "wrong"))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/distributor/applications").with(httpBasic("admin", ADMIN_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].companyName").value("Acme"))
                .andExpect(jsonPath("$.content[0].models[0]").value("H32X (10L)"))
                .andExpect(jsonPath("$.content[0].documentRef").doesNotExist());
    }

    @Test
    void adminCanChangeStatusAndDownloadDocument() throws Exception {
        mvc.perform(valid("Acme").file(new MockMultipartFile("file", "p.pdf", "application/pdf", PDF))).andExpect(status().isCreated());
        String id = repository.findAll().get(0).getId().toString();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/admin/distributor/applications/" + id + "/status")
                        .with(httpBasic("admin", ADMIN_PASSWORD)).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"APPROVED\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"));
        mvc.perform(get("/api/admin/distributor/applications/" + id + "/document")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/distributor/applications/" + id + "/document").with(httpBasic("admin", ADMIN_PASSWORD)))
                .andExpect(status().isOk()).andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    void corsAllowsConfiguredOriginOnly() throws Exception {
        mvc.perform(options(URL).header("Origin", "http://localhost:3000").header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
        mvc.perform(options(URL).header("Origin", "https://evil.example").header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }

    private static long countFiles() throws Exception {
        try (Stream<Path> s = Files.walk(AbstractMysqlIntegrationTest.STORAGE)) {
            return s.filter(Files::isRegularFile).count();
        }
    }
}
