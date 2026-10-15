package com.hawkaerospace.distributor;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.hawkaerospace.distributor.web.FixedWindowRateLimiter;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class FixedWindowRateLimiterTest {

    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(java.time.ZoneId z) { return this; }
        public Instant instant() { return now; }
    }

    @Test
    void blocksAfterLimitPerKeyAndRecoversAfterWindow() {
        MutableClock clock = new MutableClock();
        FixedWindowRateLimiter l = new FixedWindowRateLimiter(2, Duration.ofMinutes(10), clock);
        assertTrue(l.tryAcquire("1.1.1.1").allowed());
        assertTrue(l.tryAcquire("1.1.1.1").allowed());
        FixedWindowRateLimiter.Decision blocked = l.tryAcquire("1.1.1.1");
        assertFalse(blocked.allowed());
        assertTrue(blocked.retryAfterSeconds() > 0 && blocked.retryAfterSeconds() <= 600);
        assertTrue(l.tryAcquire("2.2.2.2").allowed(), "other clients are not affected");
        clock.now = clock.now.plusSeconds(601);
        assertTrue(l.tryAcquire("1.1.1.1").allowed());
    }
}
