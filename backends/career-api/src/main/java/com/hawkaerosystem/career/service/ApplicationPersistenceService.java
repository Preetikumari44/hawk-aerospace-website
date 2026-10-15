package com.hawkaerosystem.career.service;

import com.hawkaerosystem.career.dto.ApplicationRequest;
import com.hawkaerosystem.career.entity.DroneApplication;
import com.hawkaerosystem.career.entity.NotificationOutbox;
import com.hawkaerosystem.career.repository.DroneApplicationRepository;
import com.hawkaerosystem.career.repository.NotificationOutboxRepository;
import com.hawkaerosystem.career.storage.StoredFile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The single transactional unit: application row + notification outbox row are committed together or not at all. */
@Service
public class ApplicationPersistenceService {

    private final DroneApplicationRepository applications;
    private final NotificationOutboxRepository outbox;

    public ApplicationPersistenceService(DroneApplicationRepository applications, NotificationOutboxRepository outbox) {
        this.applications = applications;
        this.outbox = outbox;
    }

    @Transactional
    public PersistedApplication save(ApplicationRequest request, StoredFile cv, StoredFile license) {
        DroneApplication application = new DroneApplication(
                request.getFullName(),
                request.getEmail(),
                request.getPhoneCode(),
                request.getPhone(),
                request.getCountry(),
                request.getResidency(),
                request.getHasLicense(),
                request.getHasExperience(),
                request.experienceInfoOrDefault(),
                request.getOwnDrone(),
                request.ownDroneInfoOrDefault(),
                request.getWillingTravel(),
                request.getVisaInvestment(),
                cv == null ? "" : cv.key(),
                license == null ? "" : license.key());
        application = applications.saveAndFlush(application);
        NotificationOutbox notification = outbox.save(NotificationOutbox.pendingFor(application.getId()));
        return new PersistedApplication(application.getId(), notification.getId());
    }
}
