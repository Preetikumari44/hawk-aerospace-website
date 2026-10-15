package com.hawkaerospace.distributor.web;

import com.hawkaerospace.distributor.domain.ApplicationStatus;
import com.hawkaerospace.distributor.domain.DistributorApplication;
import com.hawkaerospace.distributor.domain.NotificationStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Admin-facing representation. Exposes whether a document exists, never its storage reference. */
public record ApplicationView(
        UUID id, String country, String city, List<String> models, String companyName, String website,
        String businessType, String turnover, String name, String jobTitle, String email, String countryCode,
        String phone, String brands, String message, boolean hasDocument, String documentName,
        String documentContentType, Long documentSizeBytes, ApplicationStatus status, Instant submittedAt,
        Instant updatedAt, NotificationStatus notificationStatus, int notificationAttempts) {

    public static ApplicationView from(DistributorApplication a) {
        return new ApplicationView(
                a.getId(), a.getCountry(), a.getCity(), List.copyOf(a.getModels()), a.getCompanyName(), a.getWebsite(),
                a.getBusinessType(), a.getTurnover(), a.getApplicantName(), a.getJobTitle(), a.getEmail(),
                a.getCountryCode(), a.getPhone(), a.getBrands(), a.getMessage(), a.getDocumentRef() != null,
                a.getDocumentOriginalName(), a.getDocumentContentType(), a.getDocumentSizeBytes(), a.getStatus(),
                a.getSubmittedAt(), a.getUpdatedAt(), a.getNotificationStatus(), a.getNotificationAttempts());
    }
}
