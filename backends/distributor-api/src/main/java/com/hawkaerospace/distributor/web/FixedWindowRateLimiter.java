package com.hawkaerospace.distributor.web;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-key fixed-window limiter, in memory, JDK only. Good for a single instance; behind several instances
 * put the limit at the gateway/WAF or back it with Redis.
 */
public class FixedWindowRateLimiter {

    public record Decision(boolean allowed, long retryAfterSeconds) {}

    private static final class Window {
        Instant start;
        int count;
        Window(Instant start) { this.start = start; }
    }

    private static final int MAX_KEYS = 100_000;

    private final int maxRequests;
    private final Duration window;
    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public FixedWindowRateLimiter(int maxRequests, Duration window) {
        this(maxRequests, window, Clock.systemUTC());
    }

    public FixedWindowRateLimiter(int maxRequests, Duration window, Clock clock) {
        this.maxRequests = maxRequests;
        this.window = window;
        this.clock = clock;
    }

    public Decision tryAcquire(String key) {
        Instant now = clock.instant();
        if (windows.size() > MAX_KEYS) evictExpired(now);
        Window w = windows.computeIfAbsent(key, k -> new Window(now));
        synchronized (w) {
            if (!now.isBefore(w.start.plus(window))) {
                w.start = now;
                w.count = 0;
            }
            if (w.count >= maxRequests) {
                long retry = Math.max(1, Duration.between(now, w.start.plus(window)).toSeconds());
                return new Decision(false, retry);
            }
            w.count++;
            return new Decision(true, 0);
        }
    }

    private void evictExpired(Instant now) {
        for (Iterator<Map.Entry<String, Window>> it = windows.entrySet().iterator(); it.hasNext(); ) {
            Window w = it.next().getValue();
            if (!now.isBefore(w.start.plus(window))) it.remove();
        }
    }
}
