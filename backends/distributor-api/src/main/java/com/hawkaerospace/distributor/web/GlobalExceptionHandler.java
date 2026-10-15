package com.hawkaerospace.distributor.web;

import com.hawkaerospace.distributor.service.ApplicationAdminService;
import com.hawkaerospace.distributor.storage.StorageException;
import com.hawkaerospace.distributor.validation.InvalidUploadException;
import com.hawkaerospace.distributor.validation.ValidationFailedException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** One consistent JSON error shape; internals (SQL, paths, stack traces) are logged, never returned. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ValidationFailedException.class)
    ResponseEntity<ApiError> validation(ValidationFailedException e) {
        List<ApiError.FieldError> errors = e.issues().stream().map(i -> new ApiError.FieldError(i.field(), i.message())).toList();
        String message = errors.size() == 1 ? errors.get(0).message()
                : errors.get(0).message() + " (and " + (errors.size() - 1) + " more field problem" + (errors.size() == 2 ? "" : "s") + ")";
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message, errors);
    }

    @ExceptionHandler(InvalidUploadException.class)
    ResponseEntity<ApiError> invalidUpload(InvalidUploadException e) {
        return build(HttpStatus.BAD_REQUEST, e.code(), e.getMessage(), List.of(new ApiError.FieldError("file", e.getMessage())));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> tooLarge(MaxUploadSizeExceededException e) {
        String m = "The uploaded file is larger than the maximum of 10 MB.";
        return build(HttpStatus.BAD_REQUEST, InvalidUploadException.TOO_LARGE, m, List.of(new ApiError.FieldError("file", m)));
    }

    @ExceptionHandler({MultipartException.class, HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiError> badRequest(Exception e) {
        return build(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "The request could not be read. Send multipart/form-data with the documented fields.", null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> beanValidation(MethodArgumentNotValidException e) {
        List<ApiError.FieldError> errors = e.getBindingResult().getFieldErrors().stream()
                .map(f -> new ApiError.FieldError(f.getField(), f.getDefaultMessage())).toList();
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", errors.isEmpty() ? "Invalid request." : errors.get(0).message(), errors);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> mediaType(HttpMediaTypeNotSupportedException e) {
        return build(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be multipart/form-data.", null);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> method(HttpRequestMethodNotSupportedException e) {
        return build(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "Method not allowed.", null);
    }

    @ExceptionHandler({ApplicationAdminService.NotFound.class, NoResourceFoundException.class})
    ResponseEntity<ApiError> notFound(Exception e) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", "Not found.", null);
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<ApiError> database(DataAccessException e) {
        log.error("Database failure while handling request", e);
        return build(HttpStatus.SERVICE_UNAVAILABLE, "DATABASE_UNAVAILABLE",
                "We could not save your application right now. It was NOT submitted. Please try again in a few minutes.", null);
    }

    @ExceptionHandler(StorageException.class)
    ResponseEntity<ApiError> storage(StorageException e) {
        log.error("Document storage failure", e);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_FAILED",
                "We could not store your document. Your application was NOT submitted. Please try again.", null);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception e) {
        log.error("Unexpected error", e);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "Something went wrong on our side. Your application was NOT submitted. Please try again later.", null);
    }

    private static ResponseEntity<ApiError> build(HttpStatus status, String code, String message, List<ApiError.FieldError> errors) {
        return ResponseEntity.status(status).body(ApiError.of(status.value(), code, message, errors));
    }
}
