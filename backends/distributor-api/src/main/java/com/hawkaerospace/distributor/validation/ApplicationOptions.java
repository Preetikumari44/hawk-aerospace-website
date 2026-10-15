package com.hawkaerospace.distributor.validation;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Accepted values, mirrored from the frontend (lib/application.ts, lib/countries.ts).
 * Countries and calling codes are loaded from classpath:options/*.txt, generated from the frontend source.
 */
@Component
public class ApplicationOptions {

    /** Canonical order (H32X -> H200). Stored exactly as the original checkbox values. */
    public static final List<String> DRONE_MODELS = List.of("H32X (10L)", "H60-4 (30L)", "H120 (50L)", "H200 (100L)");

    public static final List<String> BUSINESS_TYPES =
            List.of("Drone Dealer", "Agricultural Machinery Dealer", "Farmer", "Others");

    public static final List<String> TURNOVER_OPTIONS = List.of(
            "Under \u20ac1m", "\u20ac1m - \u20ac5m", "\u20ac5m - \u20ac10m", "\u20ac10m - \u20ac50m", "Above \u20ac50m");

    private final Set<String> countries = load("/options/countries.txt");
    private final Set<String> callingCodes = load("/options/calling-codes.txt");

    public boolean isCountry(String v) { return countries.contains(v); }
    public boolean isCallingCode(String v) { return callingCodes.contains(v); }
    public boolean isModel(String v) { return DRONE_MODELS.contains(v); }
    public boolean isBusinessType(String v) { return BUSINESS_TYPES.contains(v); }
    public boolean isTurnover(String v) { return TURNOVER_OPTIONS.contains(v); }
    public int countryCount() { return countries.size(); }

    private static Set<String> load(String resource) {
        try (InputStream in = ApplicationOptions.class.getResourceAsStream(resource)) {
            if (in == null) throw new IllegalStateException("Missing classpath resource " + resource);
            BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            Set<String> out = new LinkedHashSet<>();
            String line;
            while ((line = r.readLine()) != null) {
                if (!line.isBlank()) out.add(line.trim());
            }
            return Set.copyOf(out);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
