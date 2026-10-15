package com.hawkaerospace.distributor;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MySQLContainer;

/**
 * Real MySQL, never an in-memory database. Flyway runs the real migration against it.
 *
 * <p>By default a throw-away MySQL 8.4 container is started with Testcontainers (needs Docker).
 * If Docker is not available, point the tests at an EMPTY, dedicated test schema instead:
 * <pre>
 *   TEST_MYSQL_URL=jdbc:mysql://localhost:3306/hawk_distributor_test?connectionTimeZone=UTC
 *   TEST_MYSQL_USER=...   TEST_MYSQL_PASSWORD=...
 * </pre>
 * The tests delete all rows in that schema, so never use a real/production database here.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {"app.rate-limit.max-requests=1000", "app.notification.retry-enabled=false"})
abstract class AbstractMysqlIntegrationTest {

    static final String EXTERNAL_URL = System.getenv("TEST_MYSQL_URL");
    static final MySQLContainer<?> MYSQL;
    static final Path STORAGE;
    static final String ADMIN_PASSWORD = "test-admin-password";

    static {
        if (EXTERNAL_URL == null || EXTERNAL_URL.isBlank()) {
            MYSQL = new MySQLContainer<>("mysql:8.4")
                    .withDatabaseName("hawk_distributor_test")
                    .withUsername("hawk_test")
                    .withPassword("hawk_test_pw");
            MYSQL.start();
        } else {
            MYSQL = null;
        }
        try {
            STORAGE = Files.createTempDirectory("hawk-uploads-test");
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        if (MYSQL != null) {
            r.add("spring.datasource.url", MYSQL::getJdbcUrl);
            r.add("spring.datasource.username", MYSQL::getUsername);
            r.add("spring.datasource.password", MYSQL::getPassword);
        } else {
            r.add("spring.datasource.url", () -> EXTERNAL_URL);
            r.add("spring.datasource.username", () -> System.getenv().getOrDefault("TEST_MYSQL_USER", ""));
            r.add("spring.datasource.password", () -> System.getenv().getOrDefault("TEST_MYSQL_PASSWORD", ""));
        }
        r.add("spring.mail.host", () -> "localhost");
        r.add("spring.mail.username", () -> "test");
        r.add("spring.mail.password", () -> "test");
        r.add("app.cors.allowed-origins", () -> "http://localhost:3000");
        r.add("app.storage.root", () -> STORAGE.toString());
        r.add("app.mail.from", () -> "no-reply@test.local");
        r.add("app.mail.admin-to", () -> "admin@test.local");
        r.add("app.admin.username", () -> "admin");
        r.add("app.admin.password-hash", () -> "{bcrypt}" + new BCryptPasswordEncoder().encode(ADMIN_PASSWORD));
    }
}
