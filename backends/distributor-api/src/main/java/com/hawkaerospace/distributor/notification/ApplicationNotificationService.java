package com.hawkaerospace.distributor.notification;

import com.hawkaerospace.distributor.config.AppProperties;
import com.hawkaerospace.distributor.domain.DistributorApplication;
import com.hawkaerospace.distributor.domain.NotificationStatus;
import com.hawkaerospace.distributor.repository.DistributorApplicationRepository;
import com.hawkaerospace.distributor.storage.DocumentStorage;
import jakarta.mail.internet.MimeMessage;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Sends the administrator notification AFTER the application has been committed. Every attempt is recorded on the
 * row (status, attempts, last error), so {@link NotificationRetryJob} can safely retry later. Never throws.
 */
@Service
public class ApplicationNotificationService {

    private static final Logger log = LoggerFactory.getLogger(ApplicationNotificationService.class);

    /** Immutable copy of what the e-mail needs, so no database transaction is held open during SMTP. */
    record Snapshot(
            UUID id, Instant submittedAt, String country, String city, List<String> models, String companyName,
            String website, String businessType, String turnover, String name, String jobTitle, String email,
            String countryCode, String phone, String brands, String message, String documentRef,
            String documentName, Long documentSize) {}

    private final DistributorApplicationRepository repository;
    private final JavaMailSender mailSender;
    private final DocumentStorage storage;
    private final TransactionTemplate tx;
    private final AppProperties props;
    private final Clock clock;

    public ApplicationNotificationService(
            DistributorApplicationRepository repository, JavaMailSender mailSender, DocumentStorage storage,
            TransactionTemplate tx, AppProperties props, Clock clock) {
        this.repository = repository;
        this.mailSender = mailSender;
        this.storage = storage;
        this.tx = tx;
        this.props = props;
        this.clock = clock;
    }

    /** @return the resulting notification status (SENT or FAILED). */
    public NotificationStatus notifyAdmin(UUID applicationId) {
        NotificationStatus status;
        String error = null;
        try {
            Snapshot s = tx.execute(t -> repository.findWithModelsById(applicationId).map(ApplicationNotificationService::snapshot).orElse(null));
            if (s == null) {
                log.warn("Notification skipped: application {} not found", applicationId);
                return NotificationStatus.FAILED;
            }
            send(s);
            status = NotificationStatus.SENT;
        } catch (Exception e) {
            status = NotificationStatus.FAILED;
            error = MailDiagnostics.describe(e, 480);
            // Securely: class name + short message only; no credentials, no applicant data.
            log.error("Admin notification failed for application {}: {}. The application itself is saved; it will be retried.",
                    applicationId, error);
            log.debug("Notification failure detail", e);
        }
        record(applicationId, status, error);
        return status;
    }

    /**
     * Sends the acknowledgement to the address the applicant typed into the form (used ONLY as the recipient of this
     * message, never as the company recipient). Tracked separately from the admin notification. Never throws.
     */
    public NotificationStatus confirmApplicant(UUID applicationId) {
        NotificationStatus status;
        String error = null;
        try {
            Snapshot s = tx.execute(t -> repository.findWithModelsById(applicationId).map(ApplicationNotificationService::snapshot).orElse(null));
            if (s == null) {
                log.warn("Confirmation skipped: application {} not found", applicationId);
                return NotificationStatus.FAILED;
            }
            sendConfirmation(s);
            status = NotificationStatus.SENT;
        } catch (Exception e) {
            status = NotificationStatus.FAILED;
            error = MailDiagnostics.describe(e, 480);
            log.error("Applicant confirmation failed for application {}: {}. The application itself is saved; it will be retried.",
                    applicationId, error);
            log.debug("Confirmation failure detail", e);
        }
        try {
            NotificationStatus finalStatus = status;
            String finalError = error;
            tx.executeWithoutResult(t -> repository.recordConfirmationAttempt(applicationId, finalStatus, Instant.now(clock), finalError));
        } catch (Exception e) {
            log.error("Could not record confirmation state for application {}", applicationId);
        }
        return status;
    }

    private void sendConfirmation(Snapshot s) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
        helper.setFrom(props.mail().from());
        helper.setTo(s.email()); // already validated: no whitespace/CR/LF possible
        helper.setSubject("We have received your distributor application - Hawk Aerospace");
        helper.setText(confirmationBody(s), false);
        mailSender.send(message);
    }

    static String confirmationBody(Snapshot s) {
        StringBuilder b = new StringBuilder();
        b.append("Hello ").append(oneLine(s.name() == null ? "" : s.name())).append(",\n\n");
        b.append("Thank you for applying to become a Hawk Aerospace distributor / dealer. ")
                .append("We have received your application and our team will review it.\n\n");
        line(b, "Application reference", s.id().toString());
        line(b, "Company name", s.companyName());
        line(b, "Country", s.country());
        line(b, "City / Region", s.city());
        line(b, "Drone models", s.models().isEmpty() ? "(none selected)" : String.join(", ", s.models()));
        b.append("\nThis is an automatic acknowledgement.\n\nHawk Aerospace\n");
        return b.toString();
    }

    private void record(UUID id, NotificationStatus status, String error) {
        try {
            tx.executeWithoutResult(t -> repository.recordNotificationAttempt(id, status, Instant.now(clock), error));
        } catch (Exception e) {
            log.error("Could not record notification state for application {}", id);
        }
    }

    private void send(Snapshot s) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(props.mail().from());
        helper.setTo(props.mail().adminTo());
        helper.setReplyTo(s.email()); // already validated: no whitespace/CR/LF possible
        helper.setSubject(oneLine("New Distributor Application - " + s.companyName() + " (" + s.country() + ")"));

        boolean attached = false;
        if (props.mail().attachDocument() && s.documentRef() != null) {
            try {
                Path p = storage.resolve(s.documentRef());
                helper.addAttachment(s.documentName() == null ? "document" : s.documentName(), new FileSystemResource(p));
                attached = true;
            } catch (RuntimeException e) {
                log.warn("Document for application {} could not be attached", s.id());
            }
        }
        helper.setText(body(s, attached), false);
        mailSender.send(message);
    }

    static String body(Snapshot s, boolean attached) {
        StringBuilder b = new StringBuilder();
        b.append("A new distributor / dealer application was submitted.\n\n");
        line(b, "Application ID", s.id().toString());
        line(b, "Submitted at (UTC)", DateTimeFormatter.ISO_INSTANT.format(s.submittedAt()));
        b.append("\n-- Business location --\n");
        line(b, "Country", s.country());
        line(b, "City / Region", s.city());
        b.append("\n-- Drone models --\n");
        line(b, "Models", s.models().isEmpty() ? "(none selected)" : String.join(", ", s.models()));
        b.append("\n-- Company --\n");
        line(b, "Company name", s.companyName());
        line(b, "Website", s.website());
        line(b, "Business type", s.businessType());
        line(b, "Annual turnover", s.turnover());
        b.append("\n-- Applicant --\n");
        line(b, "Name", s.name());
        line(b, "Job title", s.jobTitle());
        line(b, "Email", s.email());
        line(b, "Phone / WhatsApp", s.countryCode() + " " + s.phone());
        b.append("\n-- Additional --\n");
        line(b, "Other brands represented", s.brands());
        line(b, "Message", s.message());
        line(b, "Document", s.documentName() == null ? "(none)"
                : s.documentName() + " (" + s.documentSize() + " bytes)" + (attached ? " - attached" : " - stored privately, not attached"));
        b.append("\nReply to this e-mail to answer the applicant directly.\n");
        return b.toString();
    }

    private static void line(StringBuilder b, String label, String value) {
        b.append(label).append(": ").append(value == null || value.isBlank() ? "-" : value).append('\n');
    }

    private static String oneLine(String s) {
        return s.replaceAll("[\\p{Cntrl}]", " ").trim();
    }

    private static Snapshot snapshot(DistributorApplication a) {
        return new Snapshot(a.getId(), a.getSubmittedAt(), a.getCountry(), a.getCity(), List.copyOf(a.getModels()),
                a.getCompanyName(), a.getWebsite(), a.getBusinessType(), a.getTurnover(), a.getApplicantName(),
                a.getJobTitle(), a.getEmail(), a.getCountryCode(), a.getPhone(), a.getBrands(), a.getMessage(),
                a.getDocumentRef(), a.getDocumentOriginalName(), a.getDocumentSizeBytes());
    }
}
