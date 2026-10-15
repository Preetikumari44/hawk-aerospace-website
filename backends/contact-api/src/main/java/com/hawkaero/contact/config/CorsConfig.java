package com.hawkaero.contact.config;

import jakarta.servlet.Filter;
import java.util.List;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * CORS is applied as the first servlet filter so that responses produced by the
 * rate-limit / size-limit filters (429, 413) still carry CORS headers and the
 * browser can read them. Only the configured frontend origin(s) are allowed.
 */
@Configuration
public class CorsConfig {

    @Bean
    public FilterRegistrationBean<Filter> corsFilterRegistration(AppProperties props) {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = props.cors().allowedOrigins().stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("POST", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Accept"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);

        FilterRegistrationBean<Filter> bean = new FilterRegistrationBean<>(new CorsFilter(source));
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return bean;
    }
}
