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
 * Transactional outbox for the admin notification email. A row is written in the SAME transaction as the
 * application, so an accepted application can never lose its notification: if the immediate send fails, the
 * scheduled retry job picks the row up again. Table created by db/migrations/V1__notification_outbox.sql.
 */
@Entity
@Table(name = "drone_application_notifications")
public class NotificationOutbox {

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

    protected NotificationOutbox() {
        // for JPA
    }

    public static NotificationOutbox pendingFor(Long applicationId) {
        NotificationOutbox o = new NotificationOutbox();
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
