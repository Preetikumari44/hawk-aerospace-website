package com.hawkaerospace.distributor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@TestPropertySource(properties = "app.rate-limit.max-requests=2")
class RateLimitApiTest extends AbstractMysqlIntegrationTest {

    @Autowired MockMvc mvc;
    @MockitoBean JavaMailSender mailSender;

    @Test
    void thirdRequestInWindowGets429WithJsonBody() throws Exception {
        for (int i = 0; i < 2; i++) {
            mvc.perform(multipart("/api/distributor/applications").param("country", "x")).andExpect(status().isBadRequest());
        }
        mvc.perform(multipart("/api/distributor/applications").param("country", "x"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }
}
