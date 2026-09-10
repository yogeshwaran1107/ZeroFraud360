package com.SIH.IndianBankSimulation.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base domain exception for banking and payment operations.
 */
public class BankingException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;
    private final String transactionId;

    public BankingException(HttpStatus status, String errorCode, String message) {
        this(status, errorCode, message, null, null);
    }

    public BankingException(HttpStatus status, String errorCode, String message, String transactionId) {
        this(status, errorCode, message, transactionId, null);
    }

    public BankingException(HttpStatus status, String errorCode, String message, String transactionId, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.errorCode = errorCode;
        this.transactionId = transactionId;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getTransactionId() {
        return transactionId;
    }
}
