package com.hawkaerospace.distributor.service;

import com.hawkaerospace.distributor.domain.NotificationStatus;
import java.util.UUID;

public record SubmissionResult(UUID applicationId, boolean duplicate, NotificationStatus notificationStatus) {}
