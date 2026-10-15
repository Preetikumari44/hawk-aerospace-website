package com.hawkaero.contact.contact;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {

    boolean existsByFingerprintAndCreatedAtAfter(String fingerprint, LocalDateTime since);

    List<ContactMessage> findTop50ByNotificationStatusInAndNotificationAttemptsLessThanAndCreatedAtBeforeOrderByCreatedAtAsc(
            Collection<NotificationStatus> statuses, int maxAttempts, LocalDateTime createdBefore);

    List<ContactMessage> findTop50ByConfirmationStatusInAndConfirmationAttemptsLessThanAndCreatedAtBeforeOrderByCreatedAtAsc(
            Collection<NotificationStatus> statuses, int maxAttempts, LocalDateTime createdBefore);

    @Transactional
    @Modifying
    @Query("""
            update ContactMessage m
               set m.confirmationStatus = :status,
                   m.confirmationAttempts = m.confirmationAttempts + 1,
                   m.confirmedAt = :confirmedAt,
                   m.lastConfirmationError = :error
             where m.id = :id
            """)
    int recordConfirmationAttempt(@Param("id") Long id,
                                  @Param("status") NotificationStatus status,
                                  @Param("confirmedAt") LocalDateTime confirmedAt,
                                  @Param("error") String error);

    @Transactional
    @Modifying
    @Query("""
            update ContactMessage m
               set m.notificationStatus = :status,
                   m.notificationAttempts = m.notificationAttempts + 1,
                   m.notifiedAt = :notifiedAt,
                   m.lastNotificationError = :error
             where m.id = :id
            """)
    int recordNotificationAttempt(@Param("id") Long id,
                                  @Param("status") NotificationStatus status,
                                  @Param("notifiedAt") LocalDateTime notifiedAt,
                                  @Param("error") String error);
}
