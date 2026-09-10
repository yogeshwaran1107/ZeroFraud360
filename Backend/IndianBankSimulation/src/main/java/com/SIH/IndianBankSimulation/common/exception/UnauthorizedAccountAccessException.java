package com.SIH.IndianBankSimulation.common.exception;

import org.springframework.http.HttpStatus;

public class UnauthorizedAccountAccessException extends BankingException {
    public UnauthorizedAccountAccessException(String message) {
        super(HttpStatus.FORBIDDEN, "FORBIDDEN_ACCOUNT_ACCESS", message);
    }
}
