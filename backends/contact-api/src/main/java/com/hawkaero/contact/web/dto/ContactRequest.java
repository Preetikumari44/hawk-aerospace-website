package com.hawkaero.contact.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * JSON body of POST /api/v1/contact. Field names are exactly the ones used by the
 * original PHP form (name, email, countryCode, phone, company, country, drone, message).
 *
 * Required (as in the original form): name, email, countryCode, phone, country, drone.
 * Optional: company, message.
 * {@code website} is an invisible honeypot field and must be empty.
 */
public record ContactRequest(
        @NotBlank(message = "Please enter your name.")
        @Size(max = 255, message = "Name must be at most 255 characters.")
        String name,

        @NotBlank(message = "Please enter your email address.")
        @Size(max = 255, message = "Email must be at most 255 characters.")
        @Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$", message = "Please enter a valid email address.")
        String email,

        @NotBlank(message = "Please select a country dialling code.")
        @Size(max = 10, message = "Invalid country dialling code.")
        String countryCode,

        @NotBlank(message = "Please enter your phone number.")
        @Size(max = 20, message = "Phone number must be at most 20 characters.")
        @Pattern(regexp = "^[0-9 ()+\\-.]{6,20}$",
                message = "Enter a valid phone number (digits, spaces, + ( ) - . only).")
        String phone,

        @Size(max = 255, message = "Company must be at most 255 characters.")
        String company,

        @NotBlank(message = "Please select your country.")
        @Size(max = 100, message = "Invalid country.")
        String country,

        @NotBlank(message = "Please tell us whether you are using a drone.")
        @Size(max = 10, message = "Invalid value.")
        String drone,

        @Size(max = 5000, message = "Message must be at most 5000 characters.")
        String message,

        @Size(max = 200)
        String website) {
}
