package com.hawkaerosystem.career.config;

import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS is restricted to the configured frontend origin(s). The Next.js app normally calls this API
 * server-to-server (so CORS is not even involved); the mapping exists for direct browser calls in development.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AppProperties properties;

    public WebConfig(AppProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = properties.cors() == null || properties.cors().allowedOrigins() == null
                ? List.of()
                : properties.cors().allowedOrigins().stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
        if (origins.isEmpty()) {
            return; // no browser origin allowed
        }
        registry.addMapping("/api/**")
                .allowedOrigins(origins.toArray(String[]::new))
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);
    }
}
