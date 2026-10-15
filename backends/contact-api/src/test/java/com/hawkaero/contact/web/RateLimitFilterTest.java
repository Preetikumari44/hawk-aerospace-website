package com.hawkaero.contact.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hawkaero.contact.config.AppProperties;
import org.junit.jupiter.api.Test;

class RateLimitFilterTest {

    private RateLimitFilter filter(int max, int windowSeconds) {
        AppProperties props = new AppProperties(null, null, new AppProperties.RateLimit(max, windowSeconds, false),
                null, null, null);
        return new RateLimitFilter(props, new ObjectMapper());
    }

    @Test
    void allowsUpToMaxThenBlocksUntilWindowPasses() {
        RateLimitFilter f = filter(2, 60);
        assertThat(f.tryAcquire("1.2.3.4", 0)).isZero();
        assertThat(f.tryAcquire("1.2.3.4", 1_000)).isZero();
        assertThat(f.tryAcquire("1.2.3.4", 2_000)).isPositive();
        assertThat(f.tryAcquire("5.6.7.8", 2_000)).isZero();      // other clients unaffected
        assertThat(f.tryAcquire("1.2.3.4", 61_000)).isZero();     // first hit left the window
    }
}
