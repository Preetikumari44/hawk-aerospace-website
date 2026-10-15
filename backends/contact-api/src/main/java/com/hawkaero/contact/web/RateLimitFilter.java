package com.hawkaero.contact.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hawkaero.contact.config.AppProperties;
import com.hawkaero.contact.web.dto.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Sliding-window, per-client-IP limit on POST /api/v1/contact (default 5 requests / 10 min).
 * In-memory, so it is per backend instance. Behind a reverse proxy set
 * TRUST_FORWARDED_HEADERS=true so the real client IP (X-Forwarded-For) is used - only do that
 * when the proxy overwrites that header, otherwise clients could spoof it.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 30)
public class RateLimitFilter extends OncePerRequestFilter {

    private final int maxRequests;
    private final long windowMillis;
    private final boolean trustForwarded;
    private final ObjectMapper mapper;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private long lastSweep = System.currentTimeMillis();

    public RateLimitFilter(AppProperties props, ObjectMapper mapper) {
        this.maxRequests = props.rateLimit().maxRequests();
        this.windowMillis = props.rateLimit().windowSeconds() * 1000L;
        this.trustForwarded = props.rateLimit().trustForwardedHeaders();
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !request.getRequestURI().startsWith("/api/v1/contact");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        long retryAfterSeconds = tryAcquire(clientKey(request), System.currentTimeMillis());
        if (retryAfterSeconds > 0) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            mapper.writeValue(response.getOutputStream(), ApiError.of("RATE_LIMITED",
                    "Too many requests. Please wait a few minutes and try again."));
            return;
        }
        chain.doFilter(request, response);
    }

    /** @return 0 when allowed, otherwise the number of seconds until the client may retry. */
    long tryAcquire(String key, long now) {
        sweep(now);
        Deque<Long> window = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() >= windowMillis) {
                window.pollFirst();
            }
            if (window.size() >= maxRequests) {
                long waitMillis = windowMillis - (now - window.peekFirst());
                return Math.max(1, (waitMillis + 999) / 1000);
            }
            window.addLast(now);
            return 0;
        }
    }

    private void sweep(long now) {
        if (now - lastSweep < windowMillis) {
            return;
        }
        lastSweep = now;
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                Long newest = e.getValue().peekLast();
                return newest == null || now - newest >= windowMillis;
            }
        });
    }

    private String clientKey(HttpServletRequest request) {
        if (trustForwarded) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
