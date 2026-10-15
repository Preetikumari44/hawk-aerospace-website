package com.hawkaerosystem.career.controller;

import com.hawkaerosystem.career.dto.ApplicationRequest;
import com.hawkaerosystem.career.dto.ApplicationResponse;
import com.hawkaerosystem.career.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Only a write endpoint exists. There is deliberately no list/detail endpoint: candidate data and uploaded
 * documents are not exposed over HTTP (review them directly in MySQL / the storage directory).
 */
@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService service;

    public ApplicationController(ApplicationService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApplicationResponse> submit(@Valid @ModelAttribute ApplicationRequest request) {
        ApplicationResponse response = service.submit(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
