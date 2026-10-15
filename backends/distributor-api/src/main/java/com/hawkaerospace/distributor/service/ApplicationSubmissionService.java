package com.hawkaerospace.distributor.service;

import com.hawkaerospace.distributor.config.AppProperties;
import com.hawkaerospace.distributor.domain.DistributorApplication;
import com.hawkaerospace.distributor.domain.NotificationStatus;
import com.hawkaerospace.distributor.notification.ApplicationNotificationService;
import com.hawkaerospace.distributor.storage.DocumentStorage;
import com.hawkaerospace.distributor.validation.ApplicationRequestValidator;
import com.hawkaerospace.distributor.validation.DistributorApplicationRequest;
import com.hawkaerospace.distributor.validation.FileContentInspector;
import com.hawkaerospace.distributor.validation.InvalidUploadException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Orchestrates one submission: validate -> inspect file -> de-duplicate -> store file -> COMMIT to MySQL ->
 * notify. This class is deliberately NOT transactional; the commit happens inside {@link ApplicationPersistenceService}.
 */
@Service
public class ApplicationSubmissionService {

    private static final Logger log = LoggerFactory.getLogger(ApplicationSubmissionService.class);

    private final ApplicationRequestValidator validator;
    private final ApplicationPersistenceService persistence;
    private final DocumentStorage storage;
    private final ApplicationNotificationService notifications;
    private final AppProperties props;
    private final Clock clock;

    public ApplicationSubmissionService(
            ApplicationRequestValidator validator,
            ApplicationPersistenceService persistence,
            DocumentStorage storage,
            ApplicationNotificationService notifications,
            AppProperties props,
            Clock clock) {
        this.validator = validator;
        this.persistence = persistence;
        this.storage = storage;
        this.notifications = notifications;
        this.props = props;
        this.clock = clock;
    }

    public SubmissionResult submit(DistributorApplicationRequest request, MultipartFile file) {
        validator.validateOrThrow(request);

        byte[] bytes = null;
        FileContentInspector.Result inspected = null;
        if (file != null && !file.isEmpty()) {
            try {
                bytes = file.getBytes();
            } catch (IOException e) {
                throw new InvalidUploadException(InvalidUploadException.UNREADABLE, "The uploaded file could not be read.");
            }
            inspected = FileContentInspector.inspect(file.getOriginalFilename(), bytes, props.upload().maxBytes());
        }

        Instant now = clock.instant();
        String dedupeKey = dedupeKey(request, bytes, now);

        Optional<DistributorApplication> existing = persistence.findByDedupeKey(dedupeKey);
        if (existing.isPresent()) {
            return duplicate(existing.get());
        }

        UUID id = UUID.randomUUID();
        String ref = null;
        DistributorApplication entity = new DistributorApplication(
                id, request.country(), request.city(), request.models(), request.companyName(), request.website(),
                request.businessType(), request.turnover(), request.name(), request.jobTitle(), request.email(),
                request.countryCode(), request.phone(), request.brands(), request.message(), dedupeKey, now);

        if (bytes != null) {
            ref = storage.store(id, inspected.extension(), bytes);
            entity.attachDocument(ref, safeDisplayName(file.getOriginalFilename()), inspected.contentType(), bytes.length);
        }

        try {
            persistence.save(entity); // transaction committed when this returns
        } catch (DataIntegrityViolationException e) {
            if (ref != null) storage.deleteQuietly(ref);
            Optional<DistributorApplication> raced = persistence.findByDedupeKey(dedupeKey);
            if (raced.isPresent()) return duplicate(raced.get()); // concurrent identical request won the race
            throw e;
        } catch (RuntimeException e) {
            if (ref != null) storage.deleteQuietly(ref); // do not leave an orphan file behind
            throw e;
        }

        // From here on the application is safely stored. Nothing below may turn that into a failure.
        NotificationStatus outcome = notifications.notifyAdmin(id);
        notifications.confirmApplicant(id); // separate e-mail to the applicant; its outcome never changes the response
        return new SubmissionResult(id, false, outcome);
    }

    private static SubmissionResult duplicate(DistributorApplication a) {
        return new SubmissionResult(a.getId(), true, a.getNotificationStatus());
    }

    /**
     * Identical content within the same time bucket maps to the same key (unique in the database), so an accidental
     * double click / retry is collapsed, while a genuinely different application (or the same one much later) is not.
     */
    String dedupeKey(DistributorApplicationRequest r, byte[] file, Instant now) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            String canonical = String.join("\u0001",
                    r.email().toLowerCase(Locale.ROOT), r.companyName().toLowerCase(Locale.ROOT), r.country(), r.city(),
                    String.join("|", r.models()), r.countryCode() + r.phone().replaceAll("\\D", ""),
                    r.name().toLowerCase(Locale.ROOT), nz(r.website()), nz(r.jobTitle()), r.businessType(), r.turnover(),
                    nz(r.brands()), nz(r.message()));
            md.update(canonical.getBytes(StandardCharsets.UTF_8));
            md.update((byte) 2);
            if (file != null) md.update(file);
            long window = Math.max(1, props.duplicateWindowSeconds());
            long bucket = now.getEpochSecond() / window;
            return HexFormat.of().formatHex(md.digest()) + ":" + bucket;
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String nz(String s) { return s == null ? "" : s; }

    /** For display/e-mail only. Never used as a path. */
    static String safeDisplayName(String original) {
        if (original == null) return "document";
        int slash = Math.max(original.lastIndexOf('/'), original.lastIndexOf('\\'));
        String base = original.substring(slash + 1).replaceAll("[^\\p{L}\\p{N}._ ()-]", "_").trim();
        if (base.isEmpty()) base = "document";
        return base.length() > 150 ? base.substring(base.length() - 150) : base;
    }
}
