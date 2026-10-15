package com.hawkaero.contact.mail;

import com.hawkaero.contact.config.AppProperties;
import com.hawkaero.contact.contact.ContactMessage;
import com.hawkaero.contact.contact.ContactMessageRepository;
import com.hawkaero.contact.contact.NotificationStatus;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * Sends the administrator notification over SMTP (same content as the original PHP mail:
 * name, email, phone, country, drone user, company, message; Reply-To = the visitor).
 *
 * A failure here never affects the stored enquiry: the outcome is recorded on the row and
 * {@link NotificationRetryJob} tries again later.
 */
@Service
public class EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final ContactMessageRepository repository;
    private final AppProperties props;

    public EmailNotificationService(ObjectProvider<JavaMailSender> mailSender,
                                    ContactMessageRepository repository,
                                    AppProperties props) {
        this.mailSender = mailSender;
        this.repository = repository;
        this.props = props;
    }

    /** Attempts delivery and records the outcome on the row. Never throws. */
    public NotificationStatus notifyAdministrator(ContactMessage saved) {
        NotificationStatus status;
        String error = null;
        try {
            send(saved);
            status = NotificationStatus.SENT;
        } catch (NotConfiguredException e) {
            status = NotificationStatus.FAILED;
            error = e.getMessage();
            log.warn("Contact notification not sent for {}: {}", saved.getReferenceId(), error);
        } catch (Exception e) {
            status = NotificationStatus.FAILED;
            // Exception chain + redacted root-cause message (no addresses, credentials or bodies).
            error = MailDiagnostics.describe(e, 255);
            log.error("Contact notification failed for {}: {}", saved.getReferenceId(), error);
            log.debug("Contact notification failure detail", e);
        }

        try {
            repository.recordNotificationAttempt(
                    saved.getId(), status,
                    status == NotificationStatus.SENT ? LocalDateTime.now(ZoneOffset.UTC) : null,
                    error);
        } catch (Exception e) {
            log.error("Could not record notification state for {} ({})", saved.getReferenceId(),
                    e.getClass().getSimpleName());
        }
        return status;
    }

    /**
     * Sends the acknowledgement to the address the visitor typed into the form (that address is used ONLY as
     * the recipient of this confirmation, never as the company recipient). Records the outcome on the row.
     * Never throws; a failure never affects the stored enquiry or the company notification.
     */
    public NotificationStatus confirmApplicant(ContactMessage saved) {
        NotificationStatus status;
        String error = null;
        try {
            sendConfirmation(saved);
            status = NotificationStatus.SENT;
        } catch (NotConfiguredException e) {
            status = NotificationStatus.FAILED;
            error = e.getMessage();
            log.warn("Contact confirmation not sent for {}: {}", saved.getReferenceId(), error);
        } catch (Exception e) {
            status = NotificationStatus.FAILED;
            error = MailDiagnostics.describe(e, 255);
            log.error("Contact confirmation failed for {}: {}", saved.getReferenceId(), error);
            log.debug("Contact confirmation failure detail", e);
        }

        try {
            repository.recordConfirmationAttempt(
                    saved.getId(), status,
                    status == NotificationStatus.SENT ? LocalDateTime.now(ZoneOffset.UTC) : null,
                    error);
        } catch (Exception e) {
            log.error("Could not record confirmation state for {} ({})", saved.getReferenceId(),
                    e.getClass().getSimpleName());
        }
        return status;
    }

    private void sendConfirmation(ContactMessage m) throws Exception {
        AppProperties.Mail mail = props.mail();
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null || isBlank(mail.host()) || isBlank(mail.from())) {
            throw new NotConfiguredException("SMTP is not configured (SMTP_HOST / MAIL_FROM)");
        }

        MimeMessage mime = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name()); // multipart=true is REQUIRED for setText(plain, html)
        helper.setFrom(mail.from(), mail.fromName());
        helper.setTo(m.getEmail());
        helper.setSubject("We have received your enquiry - Hawk Aerospace");
        helper.setText(confirmationPlainBody(m), confirmationHtmlBody(m));
        sender.send(mime);
    }

    private static String confirmationPlainBody(ContactMessage m) {
        return "Hello " + oneLine(m.getName()) + ",\n\n"
                + "Thank you for contacting Hawk Aerospace. We have received your enquiry and our team will "
                + "get back to you shortly.\n\n"
                + "Your reference: " + m.getReferenceId() + "\n\n"
                + "What you sent us:\n"
                + "Phone: " + fullPhone(m) + "\n"
                + "Country: " + m.getCountry() + "\n"
                + "Company: " + nullToEmpty(m.getCompany()) + "\n"
                + "Message:\n" + m.getMessage() + "\n\n"
                + "This is an automatic acknowledgement.\n\nHawk Aerospace\n";
    }

    private static String confirmationHtmlBody(ContactMessage m) {
        return "<p>Hello " + esc(oneLine(m.getName())) + ",</p>"
                + "<p>Thank you for contacting Hawk Aerospace. We have received your enquiry and our team "
                + "will get back to you shortly.</p>"
                + "<p><strong>Your reference:</strong> " + esc(m.getReferenceId()) + "</p>"
                + "<p><strong>What you sent us:</strong></p>"
                + row("Phone", fullPhone(m))
                + row("Country", m.getCountry())
                + row("Company", nullToEmpty(m.getCompany()))
                + "<p><strong>Message:</strong><br>" + esc(m.getMessage()).replace("\n", "<br>") + "</p>"
                + "<p style=\"color:#6b7280;font-size:12px\">This is an automatic acknowledgement.</p>"
                + "<p>Hawk Aerospace</p>";
    }

    private void send(ContactMessage m) throws Exception {
        AppProperties.Mail mail = props.mail();
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null || isBlank(mail.host()) || isBlank(mail.recipient())) {
            throw new NotConfiguredException("SMTP is not configured (SMTP_HOST / MAIL_RECIPIENT)");
        }

        MimeMessage mime = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name()); // multipart=true is REQUIRED for setText(plain, html)
        helper.setFrom(mail.from(), mail.fromName());
        helper.setTo(mail.recipient());
        helper.setReplyTo(m.getEmail(), m.getName());
        helper.setSubject("New Contact Submission from " + oneLine(m.getName()));
        helper.setText(plainBody(m), htmlBody(m));
        sender.send(mime);
    }

    private static String plainBody(ContactMessage m) {
        return "New Contact Message\n\n"
                + "Name: " + m.getName() + "\n"
                + "Email: " + m.getEmail() + "\n"
                + "Phone: " + fullPhone(m) + "\n"
                + "Country: " + m.getCountry() + "\n"
                + "Drone User: " + m.getDrone() + "\n"
                + "Company: " + nullToEmpty(m.getCompany()) + "\n"
                + "Message:\n" + m.getMessage() + "\n\n"
                + "Reference: " + m.getReferenceId() + "\n";
    }

    private static String htmlBody(ContactMessage m) {
        return "<h2>New Contact Message</h2>"
                + row("Name", m.getName())
                + row("Email", m.getEmail())
                + row("Phone", fullPhone(m))
                + row("Country", m.getCountry())
                + row("Drone User", m.getDrone())
                + row("Company", nullToEmpty(m.getCompany()))
                + "<p><strong>Message:</strong><br>"
                + esc(m.getMessage()).replace("\n", "<br>") + "</p>"
                + "<p style=\"color:#6b7280;font-size:12px\">Reference: " + esc(m.getReferenceId()) + "</p>";
    }

    private static String row(String label, String value) {
        return "<p><strong>" + label + ":</strong> " + esc(value) + "</p>";
    }

    private static String fullPhone(ContactMessage m) {
        return nullToEmpty(m.getCountryCode()) + " " + nullToEmpty(m.getPhone());
    }

    /** All user input is HTML-escaped before it is placed in the HTML body. */
    private static String esc(String value) {
        return HtmlUtils.htmlEscape(nullToEmpty(value));
    }

    private static String oneLine(String value) {
        return nullToEmpty(value).replaceAll("[\\r\\n]+", " ");
    }

    private static String nullToEmpty(String v) {
        return v == null ? "" : v;
    }

    private static boolean isBlank(String v) {
        return v == null || v.isBlank();
    }

    private static final class NotConfiguredException extends Exception {
        NotConfiguredException(String message) {
            super(message);
        }
    }
}
