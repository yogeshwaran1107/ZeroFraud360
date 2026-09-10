package com.SIH.IndianBankSimulation.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/**
 * Standard API error model matching specification section 36.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiErrorResponse {

    private Instant timestamp;
    private int status;
    private String code;
    private String message;
    private String correlationId;
    private String transactionId;
    private Map<String, String> fieldErrors;

    public ApiErrorResponse() {
    }

    public ApiErrorResponse(Instant timestamp, int status, String code, String message, String correlationId, String transactionId) {
        this.timestamp = timestamp;
        this.status = status;
        this.code = code;
        this.message = message;
        this.correlationId = correlationId;
        this.transactionId = transactionId;
    }

    public static Builder builder() {
        return new Builder();
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }

    public void setFieldErrors(Map<String, String> fieldErrors) {
        this.fieldErrors = fieldErrors;
    }

    public static class Builder {
        private Instant timestamp = Instant.now();
        private int status;
        private String code;
        private String message;
        private String correlationId;
        private String transactionId;
        private Map<String, String> fieldErrors;

        public Builder timestamp(Instant timestamp) {
            this.timestamp = timestamp;
            return this;
        }

        public Builder status(int status) {
            this.status = status;
            return this;
        }

        public Builder code(String code) {
            this.code = code;
            return this;
        }

        public Builder message(String message) {
            this.message = message;
            return this;
        }

        public Builder correlationId(String correlationId) {
            this.correlationId = correlationId;
            return this;
        }

        public Builder transactionId(String transactionId) {
            this.transactionId = transactionId;
            return this;
        }

        public Builder fieldErrors(Map<String, String> fieldErrors) {
            this.fieldErrors = fieldErrors;
            return this;
        }

        public ApiErrorResponse build() {
            ApiErrorResponse response = new ApiErrorResponse(timestamp, status, code, message, correlationId, transactionId);
            response.setFieldErrors(fieldErrors);
            return response;
        }
    }
}
