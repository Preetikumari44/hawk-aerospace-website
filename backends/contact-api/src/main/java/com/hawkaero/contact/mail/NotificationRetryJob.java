package com.hawkaero.contact.mail;

import com.hawkaero.contact.config.AppProperties;
import com.hawkaero.contact.contact.ContactMessage;
import com.hawkaero.contact.contact.ContactMessageRepository;
import com.hawkaero.contact.contact.NotificationStatus;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Re-sends administrator emails that failed (or were never attempted, e.g. the app stopped
 * right after saving). Bounded by max attempts so a permanently broken SMTP setup does not
 * loop forever. Safe to run on a single backend instance; with several instances a message
 * may occasionally be e-mailed twice.
 */
@Component
public class NotificationRetryJob {

    private static final Logger log = LoggerFactory.getLogger(NotificationRetryJob.class);

    private final ContactMessageRepository repository;
    private final EmailNotificationService notifications;
    private final AppProperties props;

    public NotificationRetryJob(ContactMessageRepository repository,
                                EmailNotificationService notifications,
                                AppProperties props) {
        this.repository = repository;
        this.notifications = notifications;
        this.props = props;
    }

    @Scheduled(fixedDelayString = "${app.notification.retry-delay-ms:300000}", initialDelay = 60_000)
    public void retryPending() {
        if (!props.notification().retryEnabled()) {
            return;
        }
        try {
            // Rows younger than one minute are still on their first attempt.
            List<ContactMessage> due = repository
                    .findTop50ByNotificationStatusInAndNotificationAttemptsLessThanAndCreatedAtBeforeOrderByCreatedAtAsc(
                            EnumSet.of(NotificationStatus.PENDING, NotificationStatus.FAILED),
                            props.notification().maxAttempts(),
                            LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
            for (ContactMessage message : due) {
                notifications.notifyAdministrator(message);
            }
            if (!due.isEmpty()) {
                log.info("Notification retry processed {} message(s)", due.size());
            }

            // Visitor confirmations are tracked separately, so retrying one e-mail never re-sends the other.
            List<ContactMessage> confirmationsDue = repository
                    .findTop50ByConfirmationStatusInAndConfirmationAttemptsLessThanAndCreatedAtBeforeOrderByCreatedAtAsc(
                            EnumSet.of(NotificationStatus.PENDING, NotificationStatus.FAILED),
                            props.notification().maxAttempts(),
                            LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
            for (ContactMessage message : confirmationsDue) {
                notifications.confirmApplicant(message);
            }
            if (!confirmationsDue.isEmpty()) {
                log.info("Confirmation retry processed {} message(s)", confirmationsDue.size());
            }
        } catch (Exception e) {
            log.error("Notification retry run failed ({})", e.getClass().getSimpleName());
        }
    }
}
