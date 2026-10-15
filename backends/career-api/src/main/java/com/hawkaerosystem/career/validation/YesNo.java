package com.hawkaerosystem.career.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** The form's radio questions post exactly "yes" or "no". */
@Documented
@Constraint(validatedBy = YesNoValidator.class)
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
public @interface YesNo {
    String message() default "Please answer all eligibility questions with yes or no.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
