package com.hawkaerospace.distributor.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "distributor_applications")
public class DistributorApplication {

    // MySQL has no native UUID type: stored as CHAR(36) text (see V1 migration). Without this annotation
    // Hibernate 6 would expect BINARY(16) and schema validation (ddl-auto=validate) would fail.
    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private UUID id;

    @Column(name = "country", nullable = false)
    private String country;

    @Column(name = "city", nullable = false)
    private String city;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "distributor_application_models", joinColumns = @JoinColumn(name = "application_id"))
    @OrderColumn(name = "position")
    @BatchSize(size = 50)
    @Column(name = "model", nullable = false)
    private List<String> models = new ArrayList<>();

    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Column(name = "website")
    private String website;

    @Column(name = "business_type", nullable = false)
    private String businessType;

    @Column(name = "turnover", nullable = false)
    private String turnover;

    @Column(name = "applicant_name", nullable = false)
    private String applicantName;

    @Column(name = "job_title")
    private String jobTitle;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "country_code", nullable = false)
    private String countryCode;

    @Column(name = "phone", nullable = false)
    private String phone;

    @Column(name = "brands")
    private String brands;

    @Column(name = "message")
    private String message;

    @Column(name = "document_ref")
    private String documentRef;

    @Column(name = "document_original_name")
    private String documentOriginalName;

    @Column(name = "document_content_type")
    private String documentContentType;

    @Column(name = "document_size_bytes")
    private Long documentSizeBytes;

    // Pinned to VARCHAR: Hibernate 6 may otherwise expect a native MySQL ENUM column and fail schema validation.
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "status", nullable = false)
    private ApplicationStatus status = ApplicationStatus.NEW;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "dedupe_key", nullable = false, updatable = false)
    private String dedupeKey;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "notification_status", nullable = false)
    private NotificationStatus notificationStatus = NotificationStatus.PENDING;

    @Column(name = "notification_attempts", nullable = false)
    private int notificationAttempts;

    @Column(name = "notification_last_attempt_at")
    private Instant notificationLastAttemptAt;

    @Column(name = "notification_last_error")
    private String notificationLastError;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "confirmation_status", nullable = false)
    private NotificationStatus confirmationStatus = NotificationStatus.PENDING;

    @Column(name = "confirmation_attempts", nullable = false)
    private int confirmationAttempts;

    @Column(name = "confirmation_last_attempt_at")
    private Instant confirmationLastAttemptAt;

    @Column(name = "confirmation_last_error")
    private String confirmationLastError;

    protected DistributorApplication() {
        // JPA
    }

    public DistributorApplication(
            UUID id,
            String country,
            String city,
            List<String> models,
            String companyName,
            String website,
            String businessType,
            String turnover,
            String applicantName,
            String jobTitle,
            String email,
            String countryCode,
            String phone,
            String brands,
            String message,
            String dedupeKey,
            Instant now) {
        this.id = id;
        this.country = country;
        this.city = city;
        this.models = new ArrayList<>(models);
        this.companyName = companyName;
        this.website = website;
        this.businessType = businessType;
        this.turnover = turnover;
        this.applicantName = applicantName;
        this.jobTitle = jobTitle;
        this.email = email;
        this.countryCode = countryCode;
        this.phone = phone;
        this.brands = brands;
        this.message = message;
        this.dedupeKey = dedupeKey;
        this.status = ApplicationStatus.NEW;
        this.notificationStatus = NotificationStatus.PENDING;
        this.confirmationStatus = NotificationStatus.PENDING;
        this.submittedAt = now;
        this.updatedAt = now;
    }

    public void attachDocument(String ref, String originalName, String contentType, long sizeBytes) {
        this.documentRef = ref;
        this.documentOriginalName = originalName;
        this.documentContentType = contentType;
        this.documentSizeBytes = sizeBytes;
    }

    public void changeStatus(ApplicationStatus next, Instant now) {
        this.status = next;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public String getCountry() { return country; }
    public String getCity() { return city; }
    public List<String> getModels() { return models; }
    public String getCompanyName() { return companyName; }
    public String getWebsite() { return website; }
    public String getBusinessType() { return businessType; }
    public String getTurnover() { return turnover; }
    public String getApplicantName() { return applicantName; }
    public String getJobTitle() { return jobTitle; }
    public String getEmail() { return email; }
    public String getCountryCode() { return countryCode; }
    public String getPhone() { return phone; }
    public String getBrands() { return brands; }
    public String getMessage() { return message; }
    public String getDocumentRef() { return documentRef; }
    public String getDocumentOriginalName() { return documentOriginalName; }
    public String getDocumentContentType() { return documentContentType; }
    public Long getDocumentSizeBytes() { return documentSizeBytes; }
    public ApplicationStatus getStatus() { return status; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getDedupeKey() { return dedupeKey; }
    public NotificationStatus getNotificationStatus() { return notificationStatus; }
    public int getNotificationAttempts() { return notificationAttempts; }
    public Instant getNotificationLastAttemptAt() { return notificationLastAttemptAt; }
    public String getNotificationLastError() { return notificationLastError; }
    public NotificationStatus getConfirmationStatus() { return confirmationStatus; }
    public int getConfirmationAttempts() { return confirmationAttempts; }
    public Instant getConfirmationLastAttemptAt() { return confirmationLastAttemptAt; }
    public String getConfirmationLastError() { return confirmationLastError; }
}
