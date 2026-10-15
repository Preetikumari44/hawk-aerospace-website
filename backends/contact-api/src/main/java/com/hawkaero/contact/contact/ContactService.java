package com.hawkaero.contact.contact;

import com.hawkaero.contact.config.AppProperties;
import com.hawkaero.contact.mail.EmailNotificationService;
import com.hawkaero.contact.util.TextSanitizer;
import com.hawkaero.contact.web.dto.ContactRequest;
import com.hawkaero.contact.web.dto.ContactResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Processing pipeline for a contact enquiry:
 * honeypot -> sanitise -> option validation -> duplicate check -> persist (own transaction,
 * committed before anything else) -> SMTP notification (failure never undoes the save).
 */
@Service
public class ContactService {

    private static final Logger log = LoggerFactory.getLogger(ContactService.class);

    private final ContactMessageRepository repository;
    private final EmailNotificationService notifications;
    private final AppProperties props;

    public ContactService(ContactMessageRepository repository,
                          EmailNotificationService notifications,
                          AppProperties props) {
        this.repository = repository;
        this.notifications = notifications;
        this.props = props;
    }

    /**
     * Not annotated @Transactional on purpose: {@code repository.save} commits on its own, so the
     * enquiry is durable before the (slow, fallible) email step runs.
     */
    public ContactResponse submit(ContactRequest request) {
        // 1. Spam trap: real visitors never see or fill this field.
        if (request.website() != null && !request.website().isBlank()) {
            throw new SpamDetectedException();
        }

        // 2. Sanitise untrusted input.
        String name = TextSanitizer.singleLine(request.name());
        String email = TextSanitizer.singleLine(request.email()).toLowerCase(Locale.ROOT);
        String countryCode = TextSanitizer.singleLine(request.countryCode());
        String phone = TextSanitizer.singleLine(request.phone());
        String company = TextSanitizer.singleLine(request.company());
        String country = TextSanitizer.singleLine(request.country());
        String drone = TextSanitizer.singleLine(request.drone());
        String message = TextSanitizer.multiLine(request.message());

        // 3. Rules the annotations cannot express (dropdown values, values empty after cleaning).
        Map<String, String> errors = new LinkedHashMap<>();
        if (name.isEmpty()) {
            errors.put("name", "Please enter your name.");
        }
        if (email.isEmpty()) {
            errors.put("email", "Please enter your email address.");
        }
        if (phone.isEmpty()) {
            errors.put("phone", "Please enter your phone number.");
        } else if (phone.replaceAll("\\D", "").length() < 6) {
            errors.put("phone", "Enter a valid phone number (at least 6 digits).");
        }
        if (!ContactOptions.COUNTRY_CODES.contains(countryCode)) {
            errors.put("countryCode", "Please select a valid country dialling code.");
        }
        if (!ContactOptions.COUNTRIES.contains(country)) {
            errors.put("country", "Please select a country from the list.");
        }
        if (!ContactOptions.DRONE_ANSWERS.contains(drone)) {
            errors.put("drone", "Please choose Yes or No.");
        }
        if (!errors.isEmpty()) {
            throw new RequestValidationException(errors);
        }

        // Same default as the original contact.php when the message is left empty.
        String storedMessage = message.isEmpty() ? ContactOptions.EMPTY_MESSAGE_PLACEHOLDER : message;

        // 4. Duplicate check. Criteria: same email + phone + dialling code + message text inside
        //    the configured window (default 10 min) - i.e. an accidental re-submit / double click.
        //    A different message from the same person is a legitimate new enquiry and is accepted.
        String fingerprint = fingerprint(email, countryCode, phone, storedMessage);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime since = now.minusMinutes(props.duplicate().windowMinutes());
        if (repository.existsByFingerprintAndCreatedAtAfter(fingerprint, since)) {
            throw new DuplicateSubmissionException();
        }

        // 5. Persist (DataAccessExceptions propagate to GlobalExceptionHandler -> 503/500).
        String referenceId = UUID.randomUUID().toString();
        ContactMessage saved = repository.save(new ContactMessage(
                referenceId, name, email, phone, countryCode, company, country, drone,
                storedMessage, fingerprint, now));
        log.info("Contact enquiry stored (ref {})", referenceId);

        // 6. Notify. Never throws; the outcome is recorded on the row and retried later if needed.
        notifications.notifyAdministrator(saved);

        // 7. Acknowledge to the visitor (their address is only ever the recipient of this one e-mail).
        notifications.confirmApplicant(saved);

        return ContactResponse.created(referenceId);
    }

    static String fingerprint(String email, String countryCode, String phone, String message) {
        String normalisedPhone = phone.replaceAll("\\D", "");
        String normalisedMessage = message.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        String basis = email + "|" + countryCode + "|" + normalisedPhone + "|" + normalisedMessage;
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(basis.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
