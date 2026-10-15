package com.hawkaerosystem.career.repository;

import com.hawkaerosystem.career.entity.DroneApplication;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DroneApplicationRepository extends JpaRepository<DroneApplication, Long> {

    /**
     * Duplicate rule inherited from the PHP backend: an application already exists when the same email OR the same
     * phone number was submitted before (email compared case-insensitively).
     */
    boolean existsByEmailIgnoreCaseOrPhone(String email, String phone);
}
