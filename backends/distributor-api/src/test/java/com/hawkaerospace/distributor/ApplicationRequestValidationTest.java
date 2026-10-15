package com.hawkaerospace.distributor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.hawkaerospace.distributor.validation.ApplicationOptions;
import com.hawkaerospace.distributor.validation.ApplicationRequestValidator;
import com.hawkaerospace.distributor.validation.DistributorApplicationRequest;
import com.hawkaerospace.distributor.validation.FieldIssue;
import com.hawkaerospace.distributor.validation.ValidationFailedException;
import jakarta.validation.Validation;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class ApplicationRequestValidationTest {

    final ApplicationOptions options = new ApplicationOptions();
    final ApplicationRequestValidator validator =
            new ApplicationRequestValidator(Validation.buildDefaultValidatorFactory().getValidator(), options);

    static DistributorApplicationRequest valid(java.util.function.UnaryOperator<Builder> f) {
        return f.apply(new Builder()).build();
    }

    static class Builder {
        String country = "India", city = "Bengaluru", companyName = "Acme Agro", website = "www.acme.com",
                businessType = "Drone Dealer", turnover = "Under \u20ac1m", name = "Asha", jobTitle = "Director",
                email = "asha@acme.com", countryCode = "+91", phone = "98765 43210", brands = null, message = null;
        List<String> models = List.of("H120 (50L)", "H32X (10L)");
        DistributorApplicationRequest build() {
            return DistributorApplicationRequest.normalized(country, city, models, companyName, website, businessType,
                    turnover, name, jobTitle, email, countryCode, phone, brands, message);
        }
    }

    Set<String> failingFields(DistributorApplicationRequest r) {
        ValidationFailedException e = assertThrows(ValidationFailedException.class, () -> validator.validateOrThrow(r));
        return e.issues().stream().map(FieldIssue::field).collect(Collectors.toSet());
    }

    @Test
    void acceptsValidRequestAndKeepsCanonicalModelOrder() {
        DistributorApplicationRequest r = valid(b -> b);
        validator.validateOrThrow(r);
        assertEquals(List.of("H32X (10L)", "H120 (50L)"), r.models());
        assertEquals(195, options.countryCount());
    }

    @Test
    void emptySubmissionReportsAllRequiredFields() {
        DistributorApplicationRequest r = DistributorApplicationRequest.normalized(null, null, null, null, null, null, null, null, null, null, null, null, null, null);
        Set<String> f = failingFields(r);
        assertTrue(f.containsAll(Set.of("country", "city", "companyName", "name", "email", "phone")), f.toString());
    }

    @Test
    void rejectsBadValues() {
        assertEquals(Set.of("country"), failingFields(valid(b -> { b.country = "Atlantis"; return b; })));
        assertEquals(Set.of("email"), failingFields(valid(b -> { b.email = "no-at-sign"; return b; })));
        assertEquals(Set.of("email"), failingFields(valid(b -> { b.email = "a@b.com\r\nBcc: x@y.com"; return b; })));
        assertEquals(Set.of("phone"), failingFields(valid(b -> { b.phone = "12"; return b; })));
        assertEquals(Set.of("phone"), failingFields(valid(b -> { b.phone = "abc123"; return b; })));
        assertEquals(Set.of("website"), failingFields(valid(b -> { b.website = "not a url"; return b; })));
        assertEquals(Set.of("models"), failingFields(valid(b -> { b.models = List.of("H999"); return b; })));
        assertEquals(Set.of("businessType"), failingFields(valid(b -> { b.businessType = "Pirate"; return b; })));
        assertEquals(Set.of("turnover"), failingFields(valid(b -> { b.turnover = "Lots"; return b; })));
        assertEquals(Set.of("countryCode"), failingFields(valid(b -> { b.countryCode = "+9999"; return b; })));
        assertEquals(Set.of("city"), failingFields(valid(b -> { b.city = "x".repeat(151); return b; })));
        assertEquals(Set.of("name"), failingFields(valid(b -> { b.name = "Asha\u0000"; return b; })));
    }

    @Test
    void optionalFieldsMayBeBlankAndWebsiteFormatsMatchFrontend() {
        validator.validateOrThrow(valid(b -> { b.website = ""; b.jobTitle = ""; b.models = List.of(); return b; }));
        validator.validateOrThrow(valid(b -> { b.website = "https://sub.example.co.uk:8080/path?x=1"; return b; }));
        validator.validateOrThrow(valid(b -> { b.phone = "+44 (20) 7946-0958"; b.countryCode = "+44"; return b; }));
    }
}
