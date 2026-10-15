package com.hawkaerospace.distributor.validation;

import java.util.List;

public class ValidationFailedException extends RuntimeException {

    private final transient List<FieldIssue> issues;

    public ValidationFailedException(List<FieldIssue> issues) {
        super("Validation failed");
        this.issues = List.copyOf(issues);
    }

    public List<FieldIssue> issues() {
        return issues;
    }
}
