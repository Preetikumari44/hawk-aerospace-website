package com.hawkaero.contact.web;

import com.hawkaero.contact.contact.DuplicateSubmissionException;
import com.hawkaero.contact.contact.RequestValidationException;
import com.hawkaero.contact.contact.SpamDetectedException;
import com.hawkaero.contact.web.dto.ApiError;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Turns every failure into the {@link ApiError} JSON shape. Responses never contain stack
 * traces, SQL, or exception messages; details go to the server log only (without request
 * contents / personal data).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> onBeanValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(fe -> fields.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
        return ResponseEntity.badRequest().body(ApiError.of(
                "VALIDATION_FAILED", "Please correct the highlighted fields and try again.", fields));
    }

    @ExceptionHandler(RequestValidationException.class)
    public ResponseEntity<ApiError> onBusinessValidation(RequestValidationException ex) {
        return ResponseEntity.badRequest().body(ApiError.of(
                "VALIDATION_FAILED", "Please correct the highlighted fields and try again.",
                ex.getFieldErrors()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> onUnreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(ApiError.of(
                "MALFORMED_REQUEST", "The request body is missing or not valid JSON."));
    }

    @ExceptionHandler(SpamDetectedException.class)
    public ResponseEntity<ApiError> onSpam(SpamDetectedException ex) {
        log.warn("Submission rejected by honeypot");
        return ResponseEntity.badRequest().body(ApiError.of(
                "REQUEST_REJECTED", "We couldn\u2019t process this request."));
    }

    @ExceptionHandler(DuplicateSubmissionException.class)
    public ResponseEntity<ApiError> onDuplicate(DuplicateSubmissionException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiError.of(
                "DUPLICATE_SUBMISSION",
                "It looks like you already sent this exact message a moment ago. "
                        + "We have it and will be in touch."));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> onMethod(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(ApiError.of(
                "METHOD_NOT_ALLOWED", "This endpoint only accepts POST requests."));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiError> onMediaType(HttpMediaTypeNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(ApiError.of(
                "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json."));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> onNotFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiError.of("NOT_FOUND", "Not found."));
    }

    /** Database unreachable / pool exhausted / timeout: the client may retry later. */
    @ExceptionHandler({CannotCreateTransactionException.class, DataAccessResourceFailureException.class,
            QueryTimeoutException.class, TransientDataAccessException.class})
    public ResponseEntity<ApiError> onDatabaseUnavailable(Exception ex) {
        log.error("Database unavailable ({})", ex.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ApiError.of(
                "SERVICE_UNAVAILABLE",
                "We are temporarily unable to save your message. Please try again in a few minutes."));
    }

    /** Insert/constraint errors and anything else from the data layer. */
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiError> onDataAccess(DataAccessException ex) {
        log.error("Database error while saving contact enquiry ({})", ex.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiError.of(
                "DATABASE_ERROR", "Something went wrong on our side and your message was not sent."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> onUnexpected(Exception ex) {
        log.error("Unexpected error ({})", ex.getClass().getSimpleName(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiError.of(
                "INTERNAL_ERROR", "Something went wrong on our side and your message was not sent."));
    }
}
