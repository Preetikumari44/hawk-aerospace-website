package com.hawkaerosystem.career.controller;

import com.hawkaerosystem.career.storage.FileStorageService;
import java.sql.Connection;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);

    private final DataSource dataSource;
    private final FileStorageService storage;

    public HealthController(DataSource dataSource, FileStorageService storage) {
        this.dataSource = dataSource;
        this.storage = storage;
    }

    /** Liveness: the process is up. Says nothing about the database. */
    @GetMapping
    public Map<String, Object> liveness() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("service", "hawk-career-backend");
        body.put("time", Instant.now().toString());
        return body;
    }

    /** Readiness: the database answers and the upload directory is writable. 503 if either check fails. */
    @GetMapping("/ready")
    public ResponseEntity<Map<String, Object>> readiness() {
        boolean database = databaseUp();
        boolean files = storage.isWritable();
        Map<String, String> checks = new LinkedHashMap<>();
        checks.put("database", database ? "UP" : "DOWN");
        checks.put("storage", files ? "UP" : "DOWN");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", database && files ? "UP" : "DOWN");
        body.put("checks", checks);
        body.put("time", Instant.now().toString());
        return ResponseEntity.status(database && files ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    private boolean databaseUp() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(2);
        } catch (Exception e) {
            log.warn("Database readiness check failed: {}", e.getClass().getSimpleName());
            return false;
        }
    }
}
