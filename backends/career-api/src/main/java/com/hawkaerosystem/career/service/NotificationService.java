package com.hawkaerosystem.career.service;

import com.hawkaerosystem.career.config.AppProperties;
import com.hawkaerosystem.career.entity.DroneApplication;
import com.hawkaerosystem.career.entity.ConfirmationOutbox;
import com.hawkaerosystem.career.entity.NotificationOutbox;
import com.hawkaerosystem.career.entity.NotificationStatus;
import com.hawkaerosystem.career.repository.ConfirmationOutboxRepository;
import com.hawkaerosystem.career.repository.DroneApplicationRepository;
import com.hawkaerosystem.career.repository.NotificationOutboxRepository;
import com.hawkaerosystem.career.storage.DetectedType;
import com.hawkaerosystem.career.storage.FileStorageService;
import com.hawkaerosystem.career.validation.InputNormalizer;
import jakarta.mail.internet.MimeMessage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.core.io.FileSystemResource;
import org.springframework.web.util.HtmlUtils;

/**
 * Sends the admin notification (with CV / licence attached, as the PHP version did) and tracks the outcome in the
 * outbox table. Failures never undo the stored application; they are logged (without personal data) and retried.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss 'UTC'").withZone(ZoneOffset.UTC);

    private final JavaMailSender mailSender;
    private final NotificationOutboxRepository outbox;
    private final ConfirmationOutboxRepository confirmations;
    private final DroneApplicationRepository applications;
    private final FileStorageService storage;
    private final AppProperties properties;

    public NotificationService(JavaMailSender mailSender,
                               NotificationOutboxRepository outbox,
                               ConfirmationOutboxRepository confirmations,
                               DroneApplicationRepository applications,
                               FileStorageService storage,
                               AppProperties properties) {
        this.mailSender = mailSender;
        this.outbox = outbox;
        this.confirmations = confirmations;
        this.applications = applications;
        this.storage = storage;
        this.properties = properties;
    }

    /** Attempts one send for the given outbox row. Returns true only if the SMTP server accepted the message. */
    public boolean deliver(long notificationId) {
        Optional<NotificationOutbox> found = outbox.findById(notificationId);
        if (found.isEmpty()) {
            log.error("Notification {} not found", notificationId);
            return false;
        }
        NotificationOutbox notification = found.get();
        if (notification.getStatus() == NotificationStatus.SENT) {
            return true;
        }
        try {
            DroneApplication application = applications.findById(notification.getApplicationId())
                    .orElseThrow(() -> new IllegalStateException("Application row missing"));
            mailSender.send(buildMessage(application));
            notification.markSent();
            outbox.save(notification);
            log.info("Admin notification for application {} sent", notification.getApplicationId());
            return true;
        } catch (Exception e) {
            notification.markFailed(describe(e), properties.notification().maxAttempts());
            try {
                outbox.save(notification);
            } catch (Exception saveError) {
                log.error("Could not record notification failure for application {}", notification.getApplicationId());
            }
            if (notification.getStatus() == NotificationStatus.GAVE_UP) {
                log.error("Admin notification for application {} permanently failed after {} attempts: {}",
                        notification.getApplicationId(), notification.getAttempts(), notification.getLastError());
            } else {
                log.warn("Admin notification for application {} failed (attempt {}), will retry: {}",
                        notification.getApplicationId(), notification.getAttempts(), notification.getLastError());
            }
            return false;
        }
    }

    /**
     * Queues and sends the acknowledgement to the applicant's own address (used ONLY as the recipient of this
     * message). Runs after the application and the admin notification are already committed, and never throws:
     * a failure here cannot undo or fail the stored application.
     */
    public void sendApplicantConfirmation(long applicationId) {
        try {
            if (confirmations.existsByApplicationId(applicationId)) {
                return;
            }
            ConfirmationOutbox row = confirmations.save(ConfirmationOutbox.pendingFor(applicationId));
            deliverConfirmation(row.getId());
        } catch (Exception e) {
            log.error("Could not queue applicant confirmation for application {} ({})",
                    applicationId, e.getClass().getSimpleName());
        }
    }

    /** Attempts one send for the given confirmation row. Returns true only if the SMTP server accepted it. */
    public boolean deliverConfirmation(long confirmationId) {
        Optional<ConfirmationOutbox> found = confirmations.findById(confirmationId);
        if (found.isEmpty()) {
            return false;
        }
        ConfirmationOutbox row = found.get();
        if (row.getStatus() == NotificationStatus.SENT) {
            return true;
        }
        try {
            DroneApplication application = applications.findById(row.getApplicationId())
                    .orElseThrow(() -> new IllegalStateException("Application row missing"));
            mailSender.send(buildConfirmation(application));
            row.markSent();
            confirmations.save(row);
            log.info("Applicant confirmation for application {} sent", row.getApplicationId());
            return true;
        } catch (Exception e) {
            row.markFailed(MailDiagnostics.describe(e, 480), properties.notification().maxAttempts());
            try {
                confirmations.save(row);
            } catch (Exception saveError) {
                log.error("Could not record confirmation failure for application {}", row.getApplicationId());
            }
            log.warn("Applicant confirmation for application {} failed (attempt {}): {}",
                    row.getApplicationId(), row.getAttempts(), row.getLastError());
            return false;
        }
    }

    private MimeMessage buildConfirmation(DroneApplication a) throws Exception {
        AppProperties.Mail mail = properties.mail();
        if (isBlank(mail.from())) {
            throw new IllegalStateException("MAIL_FROM is not configured");
        }
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8"); // multipart: setText(plain, html)
        helper.setFrom(mail.from(), isBlank(mail.fromName()) ? mail.from() : mail.fromName());
        helper.setTo(a.getEmail());
        helper.setSubject("We have received your application - Hawk Aerospace");
        String name = InputNormalizer.singleLine(a.getFullName());
        helper.setText(
                "Hello " + name + ",\n\n"
                        + "Thank you for applying. We have received your drone pilot application and our team "
                        + "will review it.\n\n"
                        + "Your application ID: " + a.getId() + "\n"
                        + "Submitted on: " + TIMESTAMP.format(Instant.now()) + "\n\n"
                        + "This is an automatic acknowledgement.\n\nHawk Aerospace\n",
                "<p>Hello " + HtmlUtils.htmlEscape(name) + ",</p>"
                        + "<p>Thank you for applying. We have received your drone pilot application and our team "
                        + "will review it.</p>"
                        + "<p><b>Your application ID:</b> " + a.getId() + "<br>"
                        + "<b>Submitted on:</b> " + TIMESTAMP.format(Instant.now()) + "</p>"
                        + "<p style=\"color:#6b7280;font-size:12px\">This is an automatic acknowledgement.</p>"
                        + "<p>Hawk Aerospace</p>");
        return message;
    }

    /** Called by the scheduler: retries rows that are PENDING or FAILED and have not been touched recently. */
    public int retryDue() {
        Instant cutoff = Instant.now().minus(properties.notification().retryInterval());
        List<NotificationOutbox> due = outbox.findDue(
                List.of(NotificationStatus.PENDING, NotificationStatus.FAILED),
                cutoff,
                PageRequest.of(0, properties.notification().retryBatchSize()));
        int delivered = 0;
        for (NotificationOutbox row : due) {
            if (deliver(row.getId())) {
                delivered++;
            }
        }
        if (!due.isEmpty()) {
            log.info("Notification retry run: {} due, {} delivered", due.size(), delivered);
        }

        // Applicant confirmations are tracked in their own table, so retrying one never re-sends the other.
        List<ConfirmationOutbox> confirmationsDue;
        try {
            confirmationsDue = confirmations.findDue(
                    List.of(NotificationStatus.PENDING, NotificationStatus.FAILED),
                    cutoff,
                    PageRequest.of(0, properties.notification().retryBatchSize()));
        } catch (Exception e) {
            log.error("Confirmation retry skipped ({}); is drone_application_confirmations created?",
                    e.getClass().getSimpleName());
            return delivered;
        }
        for (ConfirmationOutbox row : confirmationsDue) {
            if (deliverConfirmation(row.getId())) {
                delivered++;
            }
        }
        if (!confirmationsDue.isEmpty()) {
            log.info("Confirmation retry run: {} due", confirmationsDue.size());
        }
        return delivered;
    }

    private MimeMessage buildMessage(DroneApplication a) throws Exception {
        AppProperties.Mail mail = properties.mail();
        if (isBlank(mail.from()) || isBlank(mail.adminTo())) {
            throw new IllegalStateException("MAIL_FROM / ADMIN_NOTIFICATION_EMAIL are not configured");
        }
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(mail.from(), isBlank(mail.fromName()) ? mail.from() : mail.fromName());
        helper.setTo(mail.adminTo());
        helper.setReplyTo(a.getEmail());
        helper.setSubject("New Drone Pilot Application \u2013 " + InputNormalizer.singleLine(a.getFullName()));
        helper.setText(htmlBody(a), true);
        attach(helper, "CV", a.getCvFile(), a.getId());
        attach(helper, "Licence", a.getLicenseFile(), a.getId());
        return message;
    }

    private void attach(MimeMessageHelper helper, String label, String key, Long applicationId) throws Exception {
        if (isBlank(key)) {
            return;
        }
        Path path = storage.resolve(key);
        if (!Files.isReadable(path)) {
            throw new IllegalStateException(label + " file is missing from storage");
        }
        String extension = key.substring(key.lastIndexOf('.') + 1);
        helper.addAttachment(label + "-" + applicationId + "." + extension, new FileSystemResource(path),
                DetectedType.mimeTypeForKey(key));
    }

    private static String htmlBody(DroneApplication a) {
        StringBuilder sb = new StringBuilder(1024);
        sb.append("<h2>New Drone Pilot Application</h2>");
        row(sb, "Full Name", a.getFullName());
        row(sb, "Email", a.getEmail());
        row(sb, "Phone", a.getPhoneCode() + " " + a.getPhone());
        row(sb, "Country", a.getCountry());
        sb.append("<br>");
        row(sb, "Residency in EU/UK", a.getResidency());
        row(sb, "Drone License", a.getHasLicense());
        row(sb, "Experience", a.getHasExperience());
        row(sb, "Experience Details", a.getExperienceInfo());
        sb.append("<br>");
        row(sb, "Own Drone", a.getOwnDrone());
        row(sb, "Drone Info", a.getOwnDroneInfo());
        sb.append("<br>");
        row(sb, "Willing to Travel", a.getWillingTravel());
        row(sb, "Visa Investment", a.getVisaInvestment());
        sb.append("<br>");
        row(sb, "Application ID", String.valueOf(a.getId()));
        row(sb, "Submitted On", TIMESTAMP.format(Instant.now()));
        return sb.toString();
    }

    private static void row(StringBuilder sb, String label, String value) {
        sb.append("<b>").append(label).append(":</b> ").append(HtmlUtils.htmlEscape(value == null ? "" : value)).append("<br>");
    }

    /** Short, credential-free description of a failure for the outbox and logs. */
    private static String describe(Exception e) {
        return MailDiagnostics.describe(e, 480);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
