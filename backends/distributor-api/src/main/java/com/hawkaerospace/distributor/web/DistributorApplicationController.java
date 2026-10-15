package com.hawkaerospace.distributor.web;

import com.hawkaerospace.distributor.domain.NotificationStatus;
import com.hawkaerospace.distributor.service.ApplicationSubmissionService;
import com.hawkaerospace.distributor.service.SubmissionResult;
import com.hawkaerospace.distributor.validation.DistributorApplicationRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Public, applicant-facing API. Intentionally has NO read endpoints. */
@RestController
@RequestMapping("/api/distributor/applications")
@Tag(name = "Distributor applications (public)")
public class DistributorApplicationController {

    static final String SAVED = "Your distributor application was submitted successfully.";
    static final String SAVED_NOTIFY_FAILED =
            "Your distributor application was saved, but we could not deliver the notification e-mail to our team yet. "
                    + "It will be retried automatically; you do not need to submit again.";
    static final String DUPLICATE = "We already received this application. You do not need to submit it again.";

    private final ApplicationSubmissionService service;

    public DistributorApplicationController(ApplicationSubmissionService service) {
        this.service = service;
    }

    @Operation(summary = "Submit a distributor / dealer application (multipart/form-data)")
    @ApiResponse(responseCode = "201", description = "Saved")
    @ApiResponse(responseCode = "200", description = "Identical application already received (duplicate collapsed)")
    @ApiResponse(responseCode = "400", description = "Invalid field or file", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "429", description = "Rate limit exceeded")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SubmissionResponse> submit(
            @RequestParam(name = "country", required = false) String country,
            @RequestParam(name = "city", required = false) String city,
            // The frontend sends repeated "models[]" parts; "models" is also accepted for plain HTML/curl clients.
            @RequestParam(name = "models[]", required = false) List<String> modelsBracket,
            @RequestParam(name = "models", required = false) List<String> models,
            @RequestParam(name = "companyName", required = false) String companyName,
            @RequestParam(name = "website", required = false) String website,
            @RequestParam(name = "businessType", required = false) String businessType,
            @RequestParam(name = "turnover", required = false) String turnover,
            @RequestParam(name = "name", required = false) String name,
            @RequestParam(name = "jobTitle", required = false) String jobTitle,
            @RequestParam(name = "email", required = false) String email,
            @RequestParam(name = "countryCode", required = false) String countryCode,
            @RequestParam(name = "phone", required = false) String phone,
            @RequestParam(name = "brands", required = false) String brands,
            @RequestParam(name = "message", required = false) String message,
            @RequestParam(name = "file", required = false) MultipartFile file) {

        List<String> allModels = new java.util.ArrayList<>();
        if (modelsBracket != null) allModels.addAll(modelsBracket);
        if (models != null) allModels.addAll(models);

        DistributorApplicationRequest request = DistributorApplicationRequest.normalized(
                country, city, allModels, companyName, website, businessType, turnover, name, jobTitle, email,
                countryCode, phone, brands, message);

        SubmissionResult result = service.submit(request, file);

        if (result.duplicate()) {
            return ResponseEntity.ok(new SubmissionResponse(true, DUPLICATE, result.applicationId(), null, null));
        }
        boolean notifyFailed = result.notificationStatus() != NotificationStatus.SENT;
        SubmissionResponse body = new SubmissionResponse(
                true,
                notifyFailed ? SAVED_NOTIFY_FAILED : SAVED,
                result.applicationId(),
                result.notificationStatus().name(),
                notifyFailed ? "NOTIFICATION_NOT_DELIVERED" : null);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }
}
