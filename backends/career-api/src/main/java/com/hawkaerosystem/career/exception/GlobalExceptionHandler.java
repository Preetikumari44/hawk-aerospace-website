package com.hawkaerosystem.career.exception;

import com.hawkaerosystem.career.dto.ErrorResponse;
import com.hawkaerosystem.career.dto.FieldErrorDto;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Maps every failure to the same JSON shape: {"status": CODE, "message": "...", "errors": [...]}.
 * Stack traces, SQL, credentials and file-system paths are never returned to clients.
 */
@org.springframework.web.bind.annotation.RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @org.springframework.web.bind.annotation.ExceptionHandler(BindException.class)
    public ResponseEntity<ErrorResponse> handleBind(BindException e) {
        Map<String, String> firstPerField = new LinkedHashMap<>();
        for (FieldError fe : e.getBindingResult().getFieldErrors()) {
            firstPerField.putIfAbsent(fe.getField(), messageFor(fe));
        }
        List<FieldErrorDto> errors = firstPerField.entrySet().stream()
                .map(en -> new FieldErrorDto(en.getKey(), en.getValue())).toList();
        String message = errors.isEmpty() ? "Invalid request." : errors.get(0).message();
        return build(HttpStatus.UNPROCESSABLE_ENTITY, new ErrorResponse("VALIDATION_ERROR", message, errors));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(DuplicateApplicationException.class)
    public ResponseEntity<ErrorResponse> handleDuplicate(DuplicateApplicationException e) {
        return build(HttpStatus.CONFLICT, ErrorResponse.of("DUPLICATE", e.getMessage()));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(FileTooLargeException.class)
    public ResponseEntity<ErrorResponse> handleTooLarge(FileTooLargeException e) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, new ErrorResponse("FILE_TOO_LARGE", e.getMessage(),
                List.of(new FieldErrorDto(e.getField(), e.getMessage()))));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(InvalidUploadException.class)
    public ResponseEntity<ErrorResponse> handleInvalidUpload(InvalidUploadException e) {
        return build(HttpStatus.BAD_REQUEST, new ErrorResponse("INVALID_UPLOAD", e.getMessage(),
                List.of(new FieldErrorDto(e.getField(), e.getMessage()))));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUpload(MaxUploadSizeExceededException e) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, ErrorResponse.of("FILE_TOO_LARGE",
                "The uploaded files are too large. Please upload smaller files."));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(MultipartException.class)
    public ResponseEntity<ErrorResponse> handleMultipart(MultipartException e) {
        return build(HttpStatus.BAD_REQUEST, ErrorResponse.of("INVALID_UPLOAD", "The upload could not be read. Please try again."));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler({HttpMediaTypeNotSupportedException.class})
    public ResponseEntity<ErrorResponse> handleMediaType(HttpMediaTypeNotSupportedException e) {
        return build(HttpStatus.UNSUPPORTED_MEDIA_TYPE, ErrorResponse.of("UNSUPPORTED_MEDIA_TYPE",
                "Send the application as multipart/form-data."));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethod(HttpRequestMethodNotSupportedException e) {
        return build(HttpStatus.METHOD_NOT_ALLOWED, ErrorResponse.of("METHOD_NOT_ALLOWED", "Method not allowed."));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class,
            MissingServletRequestParameterException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(Exception e) {
        boolean badRequest = e instanceof MissingServletRequestParameterException;
        return badRequest
                ? build(HttpStatus.BAD_REQUEST, ErrorResponse.of("BAD_REQUEST", "Request cannot be processed."))
                : build(HttpStatus.NOT_FOUND, ErrorResponse.of("NOT_FOUND", "Not found."));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler({DataAccessResourceFailureException.class,
            TransientDataAccessException.class, CannotCreateTransactionException.class})
    public ResponseEntity<ErrorResponse> handleDatabaseUnavailable(Exception e) {
        log.error("Database unavailable: {}", e.getClass().getSimpleName());
        return build(HttpStatus.SERVICE_UNAVAILABLE, ErrorResponse.of("DATABASE_UNAVAILABLE",
                "Submission failed. Please try again."));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ErrorResponse> handleDatabase(DataAccessException e) {
        log.error("Database error: {}", e.getClass().getSimpleName(), e);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ErrorResponse.of("DATABASE_ERROR", "Submission failed. Please try again."));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(StorageException.class)
    public ResponseEntity<ErrorResponse> handleStorage(StorageException e) {
        log.error("File storage error", e);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ErrorResponse.of("STORAGE_ERROR", "Submission failed. Please try again."));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception e) {
        if (e instanceof org.springframework.web.ErrorResponse framework) { // other Spring MVC client errors keep their status
            HttpStatus status = HttpStatus.resolve(framework.getStatusCode().value());
            if (status != null && status.is4xxClientError()) {
                return build(status, ErrorResponse.of("BAD_REQUEST", "Request cannot be processed."));
            }
        }
        log.error("Unexpected error", e);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ErrorResponse.of("INTERNAL_ERROR", "Submission failed. Please try again."));
    }

    private static String messageFor(FieldError fe) {
        return fe.getDefaultMessage() == null ? "Invalid value." : fe.getDefaultMessage();
    }

    private static ResponseEntity<ErrorResponse> build(HttpStatus status, ErrorResponse body) {
        return ResponseEntity.status(status).contentType(org.springframework.http.MediaType.APPLICATION_JSON).body(body);
    }
}
