package com.hawkaerospace.distributor.web;

import com.hawkaerospace.distributor.domain.ApplicationStatus;
import com.hawkaerospace.distributor.service.ApplicationAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Administrator API. Requires ROLE_ADMIN (enforced in SecurityConfig). Separate from the public submission API. */
@RestController
@RequestMapping("/api/admin/distributor/applications")
@Tag(name = "Distributor applications (admin)")
@SecurityRequirement(name = "adminBasic")
public class AdminApplicationController {

    public record StatusUpdate(@NotNull(message = "status is required") ApplicationStatus status) {}

    private final ApplicationAdminService service;

    public AdminApplicationController(ApplicationAdminService service) {
        this.service = service;
    }

    @Operation(summary = "List applications (newest first)")
    @GetMapping
    public PagedModel<ApplicationView> list(
            @RequestParam(required = false) ApplicationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<ApplicationView> result = service.list(status, PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "submittedAt")));
        return new PagedModel<>(result);
    }

    @GetMapping("/{id}")
    public ApplicationView get(@PathVariable UUID id) {
        return service.get(id);
    }

    @Operation(summary = "Change application status")
    @PatchMapping("/{id}/status")
    public ApplicationView updateStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdate body) {
        return service.updateStatus(id, body.status());
    }

    @Operation(summary = "Download the uploaded document (authorised, never a public URL)")
    @GetMapping("/{id}/document")
    public ResponseEntity<FileSystemResource> document(@PathVariable UUID id) {
        ApplicationAdminService.DocumentFile f = service.document(id);
        ContentDisposition cd = ContentDisposition.attachment().filename(f.downloadName(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .contentType(MediaType.parseMediaType(f.contentType()))
                .body(new FileSystemResource(f.path()));
    }
}
