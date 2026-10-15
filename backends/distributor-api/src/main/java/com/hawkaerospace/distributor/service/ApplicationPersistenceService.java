package com.hawkaerospace.distributor.service;

import com.hawkaerospace.distributor.domain.DistributorApplication;
import com.hawkaerospace.distributor.repository.DistributorApplicationRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Own bean so the transaction commits when {@link #save} returns. Callers only report success after that,
 * so a rolled-back or failed commit can never produce a success response.
 */
@Service
public class ApplicationPersistenceService {

    private final DistributorApplicationRepository repository;

    public ApplicationPersistenceService(DistributorApplicationRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public DistributorApplication save(DistributorApplication application) {
        return repository.saveAndFlush(application); // flush => constraint violations surface inside the tx
    }

    @Transactional(readOnly = true)
    public Optional<DistributorApplication> findByDedupeKey(String key) {
        return repository.findByDedupeKey(key);
    }
}
