package com.hawkaerosystem.career;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CareerBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(CareerBackendApplication.class, args);
    }
}
