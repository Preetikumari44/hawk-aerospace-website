package com.hawkaerospace.distributor.validation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Submitted form data. Component names are the original frontend field names
 * (the repeated multipart field {@code models[]} is bound to {@code models}).
 */
public record DistributorApplicationRequest(
        @NotBlank(message = "Select your country.") @Size(max = 100, message = "Country is too long.") String country,
        @NotBlank(message = "Enter your city or region.") @Size(max = 150, message = "City is too long (max 150).") String city,
        @Size(max = 4, message = "Select at most 4 drone models.") List<@NotBlank @Size(max = 50) String> models,
        @NotBlank(message = "Enter your company name.") @Size(max = 200, message = "Company name is too long (max 200).") String companyName,
        @Size(max = 255, message = "Website is too long (max 255).")
                @Pattern(regexp = WEBSITE_RE, flags = Pattern.Flag.CASE_INSENSITIVE,
                        message = "Enter a valid website address, for example www.example.com.") String website,
        @NotBlank(message = "Select a business type.") @Size(max = 50) String businessType,
        @NotBlank(message = "Select an annual turnover.") @Size(max = 50) String turnover,
        @NotBlank(message = "Enter your name.") @Size(max = 150, message = "Name is too long (max 150).") String name,
        @Size(max = 150, message = "Job title is too long (max 150).") String jobTitle,
        @NotBlank(message = "Enter your business email.") @Size(max = 254, message = "Email is too long.")
                @Pattern(regexp = EMAIL_RE, message = "Enter a valid email address, for example name@company.com.") String email,
        @NotBlank(message = "Select a country calling code.")
                @Pattern(regexp = "^\\+\\d{1,4}$", message = "Invalid country calling code.") String countryCode,
        @NotBlank(message = "Enter your phone or WhatsApp number.") @Size(max = 30, message = "Phone number is too long.")
                @Pattern(regexp = PHONE_RE, message = "Use digits only. Spaces, dashes and brackets are fine.") String phone,
        @Size(max = 2000, message = "Brands text is too long (max 2000).") String brands,
        @Size(max = 5000, message = "Message is too long (max 5000).") String message) {

    // Same expressions as frontend lib/validation.ts
    public static final String EMAIL_RE = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$";
    public static final String PHONE_RE = "^\\+?[\\d\\s().-]+$";
    public static final String WEBSITE_RE =
            "^(https?://)?([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}(?::\\d+)?(?:[/?#]\\S*)?$";

    /** Trims everything; optional blanks become null; models are de-duplicated and put in canonical order. */
    public static DistributorApplicationRequest normalized(
            String country, String city, List<String> models, String companyName, String website,
            String businessType, String turnover, String name, String jobTitle, String email,
            String countryCode, String phone, String brands, String message) {
        List<String> raw = models == null ? List.of() : models.stream().map(DistributorApplicationRequest::trim).toList();
        List<String> ordered = ApplicationOptions.DRONE_MODELS.stream().filter(raw::contains).toList();
        // Unknown values are kept (appended) so validation can report them instead of silently dropping them.
        List<String> unknown = raw.stream().filter(m -> m != null && !m.isEmpty() && !ApplicationOptions.DRONE_MODELS.contains(m)).distinct().toList();
        List<String> all = new java.util.ArrayList<>(ordered);
        all.addAll(unknown);
        return new DistributorApplicationRequest(
                trim(country), trim(city), all, trim(companyName), blankToNull(website), trim(businessType), trim(turnover),
                trim(name), blankToNull(jobTitle), trim(email), trim(countryCode), trim(phone),
                blankToNull(brands), blankToNull(message));
    }

    private static String trim(String s) { return s == null ? null : s.trim(); }

    private static String blankToNull(String s) {
        String t = trim(s);
        return t == null || t.isEmpty() ? null : t;
    }
}
