package com.hawkaerospace.distributor.notification;

import com.hawkaerospace.distributor.config.AppProperties;
import com.hawkaerospace.distributor.repository.DistributorApplicationRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Re-sends admin notifications that are still PENDING/FAILED (bounded by app.notification.max-attempts).
 * Single-instance safe. If you run several instances, add a distributed lock (e.g. ShedLock) around {@link #retry()}.
 */
@Component
@ConditionalOnProperty(name = "app.notification.retry-enabled", havingValue = "true")
public class NotificationRetryJob {

    private static final Logger log = LoggerFactory.getLogger(NotificationRetryJob.class);

    private final DistributorApplicationRepository repository;
    private final ApplicationNotificationService notifications;
    private final AppProperties props;
    private final Clock clock;

    public NotificationRetryJob(DistributorApplicationRepository repository, ApplicationNotificationService notifications,
                                AppProperties props, Clock clock) {
        this.repository = repository;
        this.notifications = notifications;
        this.props = props;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${app.notification.retry-interval-ms}", initialDelayString = "${app.notification.retry-interval-ms}")
    public void retry() {
        // Skip rows younger than a minute: their first attempt may still be in flight.
        Instant cutoff = Instant.now(clock).minus(Duration.ofSeconds(60));
        List<UUID> ids = repository.findNotificationsToRetry(props.notification().maxAttempts(), cutoff, PageRequest.of(0, 20));
        for (UUID id : ids) {
            notifications.notifyAdmin(id);
        }
        if (!ids.isEmpty()) log.info("Retried {} pending admin notification(s)", ids.size());

        // Applicant confirmations are tracked separately, so retrying one e-mail never re-sends the other.
        List<UUID> confirmationIds = repository.findConfirmationsToRetry(props.notification().maxAttempts(), cutoff, PageRequest.of(0, 20));
        for (UUID id : confirmationIds) {
            notifications.confirmApplicant(id);
        }
        if (!confirmationIds.isEmpty()) log.info("Retried {} pending applicant confirmation(s)", confirmationIds.size());
    }
}
