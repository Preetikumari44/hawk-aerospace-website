package com.hawkaerospace.distributor.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.UUID;

/** Success body. Superset of the {success, message} contract read by the frontend's lib/submit.ts. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SubmissionResponse(boolean success, String message, UUID applicationId, String notificationStatus, String warning) {}
