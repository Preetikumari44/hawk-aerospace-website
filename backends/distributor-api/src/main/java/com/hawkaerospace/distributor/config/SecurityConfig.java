package com.hawkaerospace.distributor.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hawkaerospace.distributor.web.FixedWindowRateLimiter;
import com.hawkaerospace.distributor.web.RateLimitFilter;
import java.time.Duration;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * Public surface: only POST /api/distributor/applications (+ health, + docs when enabled).
 * Everything under /api/admin/** needs ROLE_ADMIN (HTTP Basic). Anything else is denied.
 */
@Configuration
public class SecurityConfig {

    public static final String SUBMIT_PATH = "/api/distributor/applications";

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, AppProperties props, ObjectMapper mapper)
            throws Exception {
        FixedWindowRateLimiter limiter = new FixedWindowRateLimiter(
                props.rateLimit().maxRequests(), Duration.ofSeconds(props.rateLimit().windowSeconds()));

        http.csrf(AbstractHttpConfigurer::disable) // stateless API, no cookies/sessions
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a.requestMatchers(HttpMethod.OPTIONS, "/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, SUBMIT_PATH)
                        .permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**")
                        .permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
                        .permitAll()
                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")
                        .anyRequest()
                        .denyAll())
                .httpBasic(Customizer.withDefaults())
                // Runs after CORS so that 429 responses still carry CORS headers and the browser can read them.
                .addFilterAfter(new RateLimitFilter(limiter, mapper), CorsFilter.class);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(props.cors().allowedOrigins()); // exact origins only
        cfg.setAllowedMethods(List.of("GET", "POST", "PATCH", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("Content-Type", "Authorization", "Accept"));
        cfg.setExposedHeaders(List.of("Retry-After"));
        cfg.setAllowCredentials(false);
        cfg.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    @Bean
    UserDetailsService userDetailsService(AppProperties props) {
        InMemoryUserDetailsManager users = new InMemoryUserDetailsManager();
        String hash = props.admin().passwordHash();
        if (hash != null && !hash.isBlank()) {
            users.createUser(User.withUsername(props.admin().username())
                    .password(hash.trim())
                    .roles("ADMIN")
                    .build());
        }
        return users; // no user configured => admin API is effectively disabled
    }
}
