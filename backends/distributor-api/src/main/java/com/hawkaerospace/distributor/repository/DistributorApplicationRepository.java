package com.hawkaerospace.distributor.repository;

import com.hawkaerospace.distributor.domain.ApplicationStatus;
import com.hawkaerospace.distributor.domain.DistributorApplication;
import com.hawkaerospace.distributor.domain.NotificationStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DistributorApplicationRepository extends JpaRepository<DistributorApplication, UUID> {

    @EntityGraph(attributePaths = "models")
    Optional<DistributorApplication> findWithModelsById(UUID id);

    @EntityGraph(attributePaths = "models")
    Optional<DistributorApplication> findByDedupeKey(String dedupeKey);

    Page<DistributorApplication> findByStatus(ApplicationStatus status, Pageable pageable);

    /** Applications whose admin notification still needs to be (re)sent. */
    @Query("""
            select a.id from DistributorApplication a
            where a.notificationStatus <> com.hawkaerospace.distributor.domain.NotificationStatus.SENT
              and a.notificationAttempts < :maxAttempts
              and a.submittedAt < :olderThan
            order by a.submittedAt asc
            """)
    List<UUID> findNotificationsToRetry(
            @Param("maxAttempts") int maxAttempts, @Param("olderThan") Instant olderThan, Pageable pageable);

    /** Applications whose applicant confirmation still needs to be (re)sent. */
    @Query("""
            select a.id from DistributorApplication a
            where a.confirmationStatus <> com.hawkaerospace.distributor.domain.NotificationStatus.SENT
              and a.confirmationAttempts < :maxAttempts
              and a.submittedAt < :olderThan
            order by a.submittedAt asc
            """)
    List<UUID> findConfirmationsToRetry(
            @Param("maxAttempts") int maxAttempts, @Param("olderThan") Instant olderThan, Pageable pageable);

    @Modifying
    @Query("""
            update DistributorApplication a
               set a.confirmationStatus = :status,
                   a.confirmationAttempts = a.confirmationAttempts + 1,
                   a.confirmationLastAttemptAt = :at,
                   a.confirmationLastError = :error
             where a.id = :id
            """)
    int recordConfirmationAttempt(
            @Param("id") UUID id,
            @Param("status") NotificationStatus status,
            @Param("at") Instant at,
            @Param("error") String error);

    @Modifying
    @Query("""
            update DistributorApplication a
               set a.notificationStatus = :status,
                   a.notificationAttempts = a.notificationAttempts + 1,
                   a.notificationLastAttemptAt = :at,
                   a.notificationLastError = :error
             where a.id = :id
            """)
    int recordNotificationAttempt(
            @Param("id") UUID id,
            @Param("status") NotificationStatus status,
            @Param("at") Instant at,
            @Param("error") String error);
}
