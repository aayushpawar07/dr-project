package com.medexjob.controller;

import com.medexjob.security.AuthException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<?> handleNoHandlerFound(NoHandlerFoundException ex, WebRequest request) {
        String path = ex.getRequestURL();
        logger.warn("No handler found for path: {}", path);
        logger.warn("Request method: {}", ex.getHttpMethod());
        
        // Check if it's an admin endpoint
        if (path != null && path.contains("/api/admin/")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "Admin endpoint not found",
                "message", "The requested admin endpoint does not exist or is not properly configured.",
                "path", path,
                "suggestion", "Please verify the endpoint path and ensure the backend controller is properly registered."
            ));
        }
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
            "error", "Endpoint not found",
            "message", "The requested resource does not exist.",
            "path", path != null ? path : "unknown"
        ));
    }

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<?> handleAuthException(AuthException ex, WebRequest request) {
        return new ResponseEntity<>(Map.of("error", ex.getMessage()), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed. Please check your input.");
        problemDetail.setTitle("Validation Error");
        problemDetail.setType(URI.create("https://medexjob.com/errors/validation"));

        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        fieldError -> fieldError.getField(),
                        fieldError -> fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : "Invalid value"
                ));
        problemDetail.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(problemDetail);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        String message = ex.getMessage();
        if (message != null && message.contains("role")) {
            return new ResponseEntity<>(Map.of("error", "Invalid role value. Valid roles are: CANDIDATE, EMPLOYER, ADMIN"), HttpStatus.BAD_REQUEST);
        }
        return new ResponseEntity<>(Map.of("error", "Invalid request body. Please check your input.", "details", ex.getMessage()), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgumentException(IllegalArgumentException ex) {
        return new ResponseEntity<>(Map.of("error", ex.getMessage()), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<?> handleMaxUploadSizeExceeded(org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        logger.warn("Upload size exceeded: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of(
            "error", "File too large. Maximum allowed upload size is 50MB.",
            "message", "The uploaded file exceeds the maximum allowed size of 50MB. Please upload a smaller or compressed file."
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGlobalException(Exception ex, WebRequest request) {
        // Log the exception for debugging purposes
        logger.error("Unexpected error: {} - {}", ex.getClass().getSimpleName(), ex.getMessage());
        
        // Check if it's a common exception type and provide meaningful message
        String errorMessage = "An unexpected error occurred.";
        String errorType = ex.getClass().getSimpleName();
        Map<String, String> fieldErrors = new HashMap<>();
        
        if (ex instanceof org.springframework.dao.DataIntegrityViolationException) {
            errorMessage = "Data integrity violation. This may be due to duplicate data or invalid reference.";
        } else if (ex instanceof org.springframework.transaction.TransactionSystemException txEx) {
            // Extract ConstraintViolationException details
            Throwable cause = txEx.getRootCause();
            if (cause instanceof jakarta.validation.ConstraintViolationException cve) {
                for (jakarta.validation.ConstraintViolation<?> violation : cve.getConstraintViolations()) {
                    String field = violation.getPropertyPath().toString();
                    String message = violation.getMessage();
                    fieldErrors.put(field, message);
                }
                errorMessage = "Validation failed for fields: " + String.join(", ", fieldErrors.keySet());
            } else {
                errorMessage = "Database transaction error. Please check your input and try again.";
            }
        } else if (ex instanceof java.util.NoSuchElementException) {
            errorMessage = "The requested resource was not found.";
        } else if (ex instanceof IllegalArgumentException) {
            errorMessage = ex.getMessage() != null ? ex.getMessage() : "Invalid argument provided.";
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("error", errorMessage);
        response.put("type", errorType);
        if (!fieldErrors.isEmpty()) {
            response.put("fieldErrors", fieldErrors);
        }
        
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
