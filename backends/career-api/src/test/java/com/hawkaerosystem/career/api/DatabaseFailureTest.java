package com.hawkaerosystem.career.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hawkaerosystem.career.service.ApplicationPersistenceService;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** A failing database must never produce a success response, and uploaded files must not be orphaned. */
class DatabaseFailureTest extends AbstractApiTest {

    @MockitoBean ApplicationPersistenceService persistence;

    @Test
    void databaseOutageReturns503AndCleansUpFiles() throws Exception {
        when(persistence.save(any(), any(), any())).thenThrow(new DataAccessResourceFailureException("db down"));

        mvc.perform(request(validFields(), cv(), licence()))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("DATABASE_UNAVAILABLE"));

        assertEquals(0, storedFileCount(), "uploads of a failed transaction must be removed");
        assertEquals(0, applications.count());
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void otherDatabaseErrorsReturn500NotSuccess() throws Exception {
        when(persistence.save(any(), any(), any())).thenThrow(new DataIntegrityViolationException("Data too long"));

        mvc.perform(request(validFields(), cv()))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value("DATABASE_ERROR"));
        assertEquals(0, storedFileCount());
        verify(mailSender, never()).send(any(MimeMessage.class));
    }
}
