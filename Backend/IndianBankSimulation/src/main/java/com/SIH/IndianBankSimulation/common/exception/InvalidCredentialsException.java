package com.SIH.IndianBankSimulation.common.exception;

import org.springframework.http.HttpStatus;

public class InvalidCredentialsException extends BankingException {
    public InvalidCredentialsException(String message) {
        super(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", message);
    }
}
