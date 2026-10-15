package com.hawkaerospace.distributor;

import static org.assertj.core.api.Assertions.assertThat;

import com.hawkaerospace.distributor.validation.ApplicationOptions;
import org.junit.jupiter.api.Test;

class ApplicationOptionsTest {
    @Test
    void optionsMatchFrontend() {
        ApplicationOptions o = new ApplicationOptions();
        assertThat(o.isCountry("India")).isTrue();
        assertThat(o.isCallingCode("+91")).isTrue();
        assertThat(o.isModel("H200 (100L)")).isTrue();
        assertThat(ApplicationOptions.TURNOVER_OPTIONS).hasSize(5);
    }
}
