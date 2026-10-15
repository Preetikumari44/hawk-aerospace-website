package com.hawkaerospace.distributor.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI distributorOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Hawk Aerospace Distributor / Dealer API")
                        .version("1.0.0")
                        .description("Public submission endpoint and protected administrative endpoints."))
                .components(new Components()
                        .addSecuritySchemes("adminBasic", new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("basic")));
    }
}
