package com.hawkaero.contact.contact;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/** One row of {@code contact_messages}. Timestamps are stored in UTC. */
@Entity
@Table(name = "contact_messages")
public class ContactMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference_id", length = 36, updatable = false)
    private String referenceId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(length = 100)
    private String phone;

    @Column(name = "country_code", length = 10)
    private String countryCode;

    @Column(length = 255)
    private String company;

    @Column(length = 255)
    private String country;

    @Column(length = 50)
    private String drone;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(length = 64, updatable = false)
    private String fingerprint;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_status", nullable = false, length = 16)
    private NotificationStatus notificationStatus = NotificationStatus.PENDING;

    @Column(name = "notification_attempts", nullable = false)
    private int notificationAttempts;

    @Column(name = "notified_at")
    private LocalDateTime notifiedAt;

    @Column(name = "last_notification_error", length = 255)
    private String lastNotificationError;

    @Enumerated(EnumType.STRING)
    @Column(name = "confirmation_status", nullable = false, length = 16)
    private NotificationStatus confirmationStatus = NotificationStatus.PENDING;

    @Column(name = "confirmation_attempts", nullable = false)
    private int confirmationAttempts;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "last_confirmation_error", length = 255)
    private String lastConfirmationError;

    protected ContactMessage() {
        // JPA
    }

    public ContactMessage(String referenceId, String name, String email, String phone, String countryCode,
                          String company, String country, String drone, String message,
                          String fingerprint, LocalDateTime createdAt) {
        this.referenceId = referenceId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.countryCode = countryCode;
        this.company = company;
        this.country = country;
        this.drone = drone;
        this.message = message;
        this.fingerprint = fingerprint;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public String getReferenceId() { return referenceId; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getCountryCode() { return countryCode; }
    public String getCompany() { return company; }
    public String getCountry() { return country; }
    public String getDrone() { return drone; }
    public String getMessage() { return message; }
    public String getFingerprint() { return fingerprint; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public NotificationStatus getNotificationStatus() { return notificationStatus; }
    public int getNotificationAttempts() { return notificationAttempts; }
    public LocalDateTime getNotifiedAt() { return notifiedAt; }
    public String getLastNotificationError() { return lastNotificationError; }
    public NotificationStatus getConfirmationStatus() { return confirmationStatus; }
    public int getConfirmationAttempts() { return confirmationAttempts; }
    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public String getLastConfirmationError() { return lastConfirmationError; }
}
