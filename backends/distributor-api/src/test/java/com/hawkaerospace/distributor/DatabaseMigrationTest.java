package com.hawkaerospace.distributor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Database integration against real MySQL: Flyway migration, schema/charset, constraints, health endpoint. */
class DatabaseMigrationTest extends AbstractMysqlIntegrationTest {

    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @MockitoBean JavaMailSender mailSender;

    @Test
    void flywayAppliedV1SuccessfullyOnMysql() {
        List<String> versions = jdbc.queryForList(
                "select version from flyway_schema_history where version is not null order by installed_rank", String.class);
        assertThat(versions).isNotEmpty();
        assertThat(versions.get(0)).isEqualTo("1");
        // `success` is a BOOL column (Connector/J returns Boolean), so count failures in SQL instead of casting.
        assertThat(jdbc.queryForObject("select count(*) from flyway_schema_history where success = 0", Integer.class)).isZero();
    }

    @Test
    void tablesUseInnoDbAndUtf8mb4() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "select table_name, engine, table_collation from information_schema.tables "
                        + "where table_schema = database() and table_name like 'distributor_application%'");
        assertThat(rows).hasSize(2);
        assertThat(rows).allSatisfy(r -> {
            assertThat(String.valueOf(r.get("ENGINE"))).isEqualToIgnoringCase("InnoDB");
            assertThat(String.valueOf(r.get("TABLE_COLLATION"))).startsWith("utf8mb4");
        });
    }

    @Test
    void databaseItselfRejectsInvalidStatusAndDuplicateDedupeKey() {
        String insert = "insert into distributor_applications (id,country,city,company_name,business_type,turnover,"
                + "applicant_name,email,country_code,phone,status,submitted_at,updated_at,dedupe_key) "
                + "values (?,?,?,?,?,?,?,?,?,?,?,utc_timestamp(6),utc_timestamp(6),?)";
        String id1 = "aaaaaaaa-0000-0000-0000-000000000001";
        try {
            jdbc.update(insert, id1, "India", "Pune", "Co", "Farmer", "Under \u20ac1m", "N", "n@x.co", "+91", "1234", "NEW", "k-migration-test");
            assertThatThrownBy(() -> jdbc.update(insert, "aaaaaaaa-0000-0000-0000-000000000002", "India", "Pune", "Co",
                    "Farmer", "Under \u20ac1m", "N", "n@x.co", "+91", "1234", "NEW", "k-migration-test"))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update(insert, "aaaaaaaa-0000-0000-0000-000000000003", "India", "Pune", "Co",
                    "Farmer", "Under \u20ac1m", "N", "n@x.co", "+91", "1234", "BOGUS", "k-migration-test-2"))
                    .isInstanceOf(DataIntegrityViolationException.class);
            // utf8mb4 round trip of the euro sign used by the turnover options
            assertThat(jdbc.queryForObject("select turnover from distributor_applications where id = ?", String.class, id1))
                    .isEqualTo("Under \u20ac1m");
        } finally {
            jdbc.update("delete from distributor_applications where id like 'aaaaaaaa-0000-0000-0000-%'");
        }
    }

    @Test
    void healthEndpointReportsUpWithDatabase() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
