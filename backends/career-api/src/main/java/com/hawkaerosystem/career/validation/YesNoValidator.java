package com.hawkaerosystem.career.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class YesNoValidator implements ConstraintValidator<YesNo, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return "yes".equals(value) || "no".equals(value);
    }
}
