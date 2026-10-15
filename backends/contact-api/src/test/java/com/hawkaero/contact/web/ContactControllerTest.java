package com.hawkaero.contact.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hawkaero.contact.contact.ContactService;
import com.hawkaero.contact.contact.DuplicateSubmissionException;
import com.hawkaero.contact.web.dto.ContactResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

class ContactControllerTest {

    private static final String VALID = """
            {"name":"Asha Rao","email":"asha@example.com","countryCode":"+91","phone":"98765 43210",
             "company":"Hawk Farms","country":"India","drone":"Yes","message":"Hi","website":""}""";

    private ContactService service;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        service = mock(ContactService.class);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(new ContactController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void validRequestReturns201() throws Exception {
        when(service.submit(any())).thenReturn(ContactResponse.created("ref-1"));

        mvc.perform(post("/api/v1/contact").contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.referenceId").value("ref-1"));
    }

    @Test
    void missingRequiredFieldsReturn400WithFieldErrors() throws Exception {
        mvc.perform(post("/api/v1/contact").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.phone").exists());
    }

    @Test
    void malformedJsonReturns400() throws Exception {
        mvc.perform(post("/api/v1/contact").contentType(MediaType.APPLICATION_JSON).content("{oops"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    }

    @Test
    void duplicateReturns409() throws Exception {
        when(service.submit(any())).thenThrow(new DuplicateSubmissionException());

        mvc.perform(post("/api/v1/contact").contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_SUBMISSION"));
    }

    @Test
    void databaseOutageReturns503WithoutInternals() throws Exception {
        when(service.submit(any())).thenThrow(new DataAccessResourceFailureException("jdbc:mysql://secret-host"));

        mvc.perform(post("/api/v1/contact").contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("SERVICE_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("secret-host"))));
    }

    @Test
    void unexpectedErrorReturns500WithoutStackTrace() throws Exception {
        when(service.submit(any())).thenThrow(new IllegalStateException("boom"));

        mvc.perform(post("/api/v1/contact").contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.trace").doesNotExist());
    }
}
