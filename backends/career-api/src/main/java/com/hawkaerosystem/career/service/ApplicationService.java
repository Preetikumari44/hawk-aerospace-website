package com.hawkaerosystem.career.service;

import com.hawkaerosystem.career.config.AppProperties;
import com.hawkaerosystem.career.dto.ApplicationRequest;
import com.hawkaerosystem.career.dto.ApplicationResponse;
import com.hawkaerosystem.career.exception.DuplicateApplicationException;
import com.hawkaerosystem.career.exception.InvalidUploadException;
import com.hawkaerosystem.career.repository.DroneApplicationRepository;
import com.hawkaerosystem.career.storage.FileStorageService;
import com.hawkaerosystem.career.storage.StorageCategory;
import com.hawkaerosystem.career.storage.StoredFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * Orchestrates one submission:
 * validate uploads -> lock applicant -> duplicate check -> store files -> commit application (+ outbox) ->
 * send notification. Files stored for a submission that then fails are removed again.
 */
@Service
public class ApplicationService {

    private static final Logger log = LoggerFactory.getLogger(ApplicationService.class);

    private final DroneApplicationRepository applications;
    private final ApplicationPersistenceService persistence;
    private final FileStorageService storage;
    private final NotificationService notifications;
    private final KeyedLock keyedLock;
    private final AppProperties properties;

    public ApplicationService(DroneApplicationRepository applications,
                              ApplicationPersistenceService persistence,
                              FileStorageService storage,
                              NotificationService notifications,
                              KeyedLock keyedLock,
                              AppProperties properties) {
        this.applications = applications;
        this.persistence = persistence;
        this.storage = storage;
        this.notifications = notifications;
        this.keyedLock = keyedLock;
        this.properties = properties;
    }

    public ApplicationResponse submit(ApplicationRequest request) {
        requireUploads(request);

        PersistedApplication saved;
        try (KeyedLock.Lease ignored = keyedLock.acquire(request.getEmail(), request.getPhone())) {
            if (applications.existsByEmailIgnoreCaseOrPhone(request.getEmail(), request.getPhone())) {
                log.info("Duplicate application rejected");
                throw new DuplicateApplicationException();
            }

            StoredFile cv = null;
            StoredFile license = null;
            try {
                cv = storage.store(request.getCvFile(), StorageCategory.CV, "cvFile", "CV");
                if (hasFile(request.getLicenseFile())) {
                    license = storage.store(request.getLicenseFile(), StorageCategory.LICENSE, "licenseFile", "Drone licence copy");
                }
                saved = persistence.save(request, cv, license);
            } catch (RuntimeException e) {
                storage.deleteQuietly(cv);
                storage.deleteQuietly(license);
                throw translate(e, request);
            }
        }

        log.info("Application {} stored", saved.applicationId());
        boolean emailed = notifications.deliver(saved.notificationId());
        notifications.sendApplicantConfirmation(saved.applicationId());
        return new ApplicationResponse(
                ApplicationResponse.CREATED,
                saved.applicationId(),
                "Application submitted successfully! Please schedule your interview.",
                emailed ? ApplicationResponse.EMAIL_SENT : ApplicationResponse.EMAIL_PENDING_RETRY);
    }

    private void requireUploads(ApplicationRequest request) {
        if (!hasFile(request.getCvFile())) {
            throw new InvalidUploadException("cvFile", "CV is required.");
        }
        if (properties.upload().requireLicenseWhenLicensed()
                && "yes".equals(request.getHasLicense())
                && !hasFile(request.getLicenseFile())) {
            throw new InvalidUploadException("licenseFile", "Drone licence copy is required when you hold a licence.");
        }
    }

    private static boolean hasFile(org.springframework.web.multipart.MultipartFile file) {
        return file != null && !file.isEmpty();
    }

    /** A constraint violation caused by a concurrent identical submission becomes a duplicate, not a server error. */
    private RuntimeException translate(RuntimeException e, ApplicationRequest request) {
        if (e instanceof DataIntegrityViolationException
                && applications.existsByEmailIgnoreCaseOrPhone(request.getEmail(), request.getPhone())) {
            return new DuplicateApplicationException();
        }
        return e;
    }
}
