package com.hawkaerosystem.career.validation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.hawkaerosystem.career.dto.ApplicationRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class ApplicationRequestTest {

    private static Validator validator;

    @BeforeAll
    static void init() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private static ApplicationRequest valid() {
        ApplicationRequest r = new ApplicationRequest();
        r.setFullName("Test Pilot");
        r.setEmail("Pilot@Example.COM ");
        r.setCountry("+91");
        r.setPhoneCode("+91");
        r.setPhone("98765 43210");
        r.setResidency("YES");
        r.setHasExperience("yes");
        r.setOwnDrone("no");
        r.setWillingTravel("yes");
        r.setVisaInvestment("no");
        r.setHasLicense("yes");
        return r;
    }

    private static Set<String> invalidFields(ApplicationRequest r) {
        return validator.validate(r).stream().map(v -> v.getPropertyPath().toString()).collect(Collectors.toSet());
    }

    @Test
    void validRequestPassesAndIsNormalised() {
        ApplicationRequest r = valid();
        assertTrue(validator.validate(r).isEmpty());
        assertEquals("pilot@example.com", r.getEmail());
        assertEquals("9876543210", r.getPhone());
        assertEquals("yes", r.getResidency());
    }

    @Test
    void sameRulesAndMessagesAsFrontend() {
        ApplicationRequest r = valid();
        r.setEmail("a@b");
        r.setPhone("12ab");
        r.setFullName("Al");
        Set<ConstraintViolation<ApplicationRequest>> v = validator.validate(r);
        assertTrue(v.stream().anyMatch(x -> x.getMessage().equals(ApplicationRequest.MSG_EMAIL)));
        assertTrue(v.stream().anyMatch(x -> x.getMessage().equals(ApplicationRequest.MSG_PHONE)));
        assertTrue(v.stream().anyMatch(x -> x.getMessage().equals(ApplicationRequest.MSG_NAME)));
    }

    @Test
    void phoneBoundaries() {
        ApplicationRequest r = valid();
        r.setPhone("123456");          // 6 digits
        assertTrue(invalidFields(r).contains("phone"));
        r.setPhone("1234567");         // 7 digits
        assertTrue(validator.validate(r).isEmpty());
        r.setPhone("123456789012345"); // 15 digits
        assertTrue(validator.validate(r).isEmpty());
        r.setPhone("1234567890123456"); // 16 digits
        assertTrue(invalidFields(r).contains("phone"));
    }

    @Test
    void missingRequiredFieldsAreReported() {
        Set<String> fields = invalidFields(new ApplicationRequest());
        for (String f : new String[] {"fullName", "email", "country", "phoneCode", "phone", "residency",
                "hasExperience", "ownDrone", "willingTravel", "visaInvestment", "hasLicense"}) {
            assertTrue(fields.contains(f), "expected violation for " + f);
        }
    }

    @Test
    void radioAnswersMustBeYesOrNo() {
        ApplicationRequest r = valid();
        r.setOwnDrone("maybe");
        assertEquals(Set.of("ownDrone"), invalidFields(r));
    }

    @Test
    void optionalFreeTextDefaultsLikePhp() {
        ApplicationRequest r = valid();
        assertEquals("Not Provided", r.experienceInfoOrDefault());
        r.setExperienceInfo("   ");
        assertEquals("Not Provided", r.experienceInfoOrDefault());
        r.setOwnDroneInfo("H120 - 50L");
        assertEquals("H120 - 50L", r.ownDroneInfoOrDefault());
    }

    @Test
    void singleLineStripsHeaderInjection() {
        assertEquals("Eve Bcc: x@y.z", InputNormalizer.singleLine("Eve\r\nBcc: x@y.z"));
    }
}
