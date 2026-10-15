package com.hawkaerospace.distributor.validation;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Server-side validation: Jakarta constraints + allowed option values + control-character checks. */
@Component
public class ApplicationRequestValidator {

    private final Validator validator;
    private final ApplicationOptions options;

    public ApplicationRequestValidator(Validator validator, ApplicationOptions options) {
        this.validator = validator;
        this.options = options;
    }

    public void validateOrThrow(DistributorApplicationRequest r) {
        Map<String, String> issues = new LinkedHashMap<>(); // first message per field wins

        for (ConstraintViolation<DistributorApplicationRequest> v : validator.validate(r)) {
            String field = v.getPropertyPath().toString();
            int bracket = field.indexOf('[');
            if (bracket > 0) field = field.substring(0, bracket); // models[0] -> models
            issues.putIfAbsent(field, v.getMessage());
        }

        check(issues, "country", r.country() != null && !r.country().isEmpty() && !options.isCountry(r.country()), "Select a country from the list.");
        check(issues, "businessType", r.businessType() != null && !r.businessType().isEmpty() && !options.isBusinessType(r.businessType()), "Select a business type from the list.");
        check(issues, "turnover", r.turnover() != null && !r.turnover().isEmpty() && !options.isTurnover(r.turnover()), "Select an annual turnover from the list.");
        check(issues, "countryCode", r.countryCode() != null && !r.countryCode().isEmpty() && !options.isCallingCode(r.countryCode()), "Select a country calling code from the list.");
        if (r.models() != null) {
            for (String m : r.models()) {
                if (!options.isModel(m)) {
                    issues.putIfAbsent("models", "Unknown drone model: " + printable(m));
                    break;
                }
            }
        }
        if (r.phone() != null && r.phone().matches(DistributorApplicationRequest.PHONE_RE)) {
            int digits = r.phone().replaceAll("\\D", "").length();
            check(issues, "phone", digits < 4 || digits > 15, "Enter between 4 and 15 digits.");
        }

        singleLine(issues, "country", r.country());
        singleLine(issues, "city", r.city());
        singleLine(issues, "companyName", r.companyName());
        singleLine(issues, "website", r.website());
        singleLine(issues, "businessType", r.businessType());
        singleLine(issues, "turnover", r.turnover());
        singleLine(issues, "name", r.name());
        singleLine(issues, "jobTitle", r.jobTitle());
        singleLine(issues, "email", r.email());
        singleLine(issues, "countryCode", r.countryCode());
        singleLine(issues, "phone", r.phone());
        multiLine(issues, "brands", r.brands());
        multiLine(issues, "message", r.message());

        if (!issues.isEmpty()) {
            List<FieldIssue> list = new ArrayList<>();
            issues.forEach((f, m) -> list.add(new FieldIssue(f, m)));
            throw new ValidationFailedException(list);
        }
    }

    private static void check(Map<String, String> issues, String field, boolean bad, String msg) {
        if (bad) issues.putIfAbsent(field, msg);
    }

    private static void singleLine(Map<String, String> issues, String field, String v) {
        if (v != null && v.codePoints().anyMatch(Character::isISOControl)) {
            issues.putIfAbsent(field, "Contains characters that are not allowed.");
        }
    }

    private static void multiLine(Map<String, String> issues, String field, String v) {
        if (v != null && v.codePoints().anyMatch(c -> Character.isISOControl(c) && c != '\n' && c != '\r' && c != '\t')) {
            issues.putIfAbsent(field, "Contains characters that are not allowed.");
        }
    }

    private static String printable(String s) {
        String t = s == null ? "" : s.replaceAll("\\p{Cntrl}", "?");
        return t.length() > 40 ? t.substring(0, 40) + "..." : t;
    }
}
