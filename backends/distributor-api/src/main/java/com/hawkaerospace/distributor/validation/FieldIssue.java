package com.hawkaerospace.distributor.validation;

/** One validation problem, keyed by the original form field name. */
public record FieldIssue(String field, String message) {}
