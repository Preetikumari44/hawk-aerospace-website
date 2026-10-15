package com.hawkaerosystem.career.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;

/**
 * Delivery state of the confirmation e-mail sent to the applicant. Kept in its OWN table (created by
 * db/migrations/V3__applicant_confirmations.sql) so the existing admin-notification outbox and the stored
 * application are not affected, and a retry of one e-mail can never re-send the other. Additive; no existing
 * table is altered.
 */
@Entity
@Table(name = "drone_application_confirmations")
public class ConfirmationOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private NotificationStatus status;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "last_error", length = 500)
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected ConfirmationOutbox() {
        // for JPA
    }

    public static ConfirmationOutbox pendingFor(Long applicationId) {
        ConfirmationOutbox o = new ConfirmationOutbox();
        o.applicationId = applicationId;
        o.status = NotificationStatus.PENDING;
        return o;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void markSent() {
        attempts++;
        status = NotificationStatus.SENT;
        sentAt = Instant.now();
        lastError = null;
    }

    public void markFailed(String error, int maxAttempts) {
        attempts++;
        status = attempts >= maxAttempts ? NotificationStatus.GAVE_UP : NotificationStatus.FAILED;
        lastError = error == null ? null : (error.length() > 500 ? error.substring(0, 500) : error);
    }

    public Long getId() { return id; }
    public Long getApplicationId() { return applicationId; }
    public NotificationStatus getStatus() { return status; }
    public int getAttempts() { return attempts; }
    public String getLastError() { return lastError; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getSentAt() { return sentAt; }
}
