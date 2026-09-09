package com.SIH.IndianBankSimulation.common.exception;

import org.springframework.http.HttpStatus;

public class DuplicateResourceException extends BankingException {
    public DuplicateResourceException(String message) {
        super(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE", message);
    }
}
