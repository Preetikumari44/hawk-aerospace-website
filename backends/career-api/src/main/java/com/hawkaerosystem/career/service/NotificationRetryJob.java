package com.hawkaerosystem.career.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Periodically retries admin notifications that could not be sent immediately (SMTP outage, bad credentials...). */
@Component
public class NotificationRetryJob {

    private final NotificationService notifications;

    public NotificationRetryJob(NotificationService notifications) {
        this.notifications = notifications;
    }

    @Scheduled(initialDelayString = "${app.notification.retry-initial-delay:PT1M}",
               fixedDelayString = "${app.notification.retry-interval:PT5M}")
    public void retry() {
        notifications.retryDue();
    }
}
