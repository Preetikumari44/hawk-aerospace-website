package com.hawkaerospace.distributor.service;

import com.hawkaerospace.distributor.domain.ApplicationStatus;
import com.hawkaerospace.distributor.domain.DistributorApplication;
import com.hawkaerospace.distributor.repository.DistributorApplicationRepository;
import com.hawkaerospace.distributor.storage.DocumentStorage;
import com.hawkaerospace.distributor.web.ApplicationView;
import java.nio.file.Path;
import java.time.Clock;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationAdminService {

    public static class NotFound extends RuntimeException {
        public NotFound(String m) { super(m); }
    }

    public record DocumentFile(Path path, String downloadName, String contentType) {}

    private final DistributorApplicationRepository repository;
    private final DocumentStorage storage;
    private final Clock clock;

    public ApplicationAdminService(DistributorApplicationRepository repository, DocumentStorage storage, Clock clock) {
        this.repository = repository;
        this.storage = storage;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Page<ApplicationView> list(ApplicationStatus status, Pageable pageable) {
        Page<DistributorApplication> page = status == null ? repository.findAll(pageable) : repository.findByStatus(status, pageable);
        return page.map(ApplicationView::from);
    }

    @Transactional(readOnly = true)
    public ApplicationView get(UUID id) {
        return ApplicationView.from(find(id));
    }

    @Transactional
    public ApplicationView updateStatus(UUID id, ApplicationStatus status) {
        DistributorApplication a = find(id);
        a.changeStatus(status, clock.instant());
        return ApplicationView.from(a);
    }

    @Transactional(readOnly = true)
    public DocumentFile document(UUID id) {
        DistributorApplication a = find(id);
        if (a.getDocumentRef() == null) throw new NotFound("This application has no document.");
        return new DocumentFile(storage.resolve(a.getDocumentRef()), a.getDocumentOriginalName(), a.getDocumentContentType());
    }

    private DistributorApplication find(UUID id) {
        return repository.findWithModelsById(id).orElseThrow(() -> new NotFound("Application not found."));
    }
}
