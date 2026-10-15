package com.hawkaerospace.distributor.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hawkaerospace.distributor.config.SecurityConfig;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

/** Limits POSTs to the public submission endpoint per client address. Not a Spring bean (added to the security chain). */
public class RateLimitFilter extends OncePerRequestFilter {

    private final FixedWindowRateLimiter limiter;
    private final ObjectMapper mapper;

    public RateLimitFilter(FixedWindowRateLimiter limiter, ObjectMapper mapper) {
        this.limiter = limiter;
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !(HttpMethod.POST.matches(request.getMethod()) && SecurityConfig.SUBMIT_PATH.equals(request.getRequestURI()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        FixedWindowRateLimiter.Decision d = limiter.tryAcquire(request.getRemoteAddr());
        if (d.allowed()) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(429);
        response.setHeader("Retry-After", Long.toString(d.retryAfterSeconds()));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        mapper.writeValue(response.getOutputStream(), ApiError.of(429, "RATE_LIMITED",
                "Too many applications from your connection. Please wait a few minutes and try again."));
    }
}
