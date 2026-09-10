package com.SIH.IndianBankSimulation.common.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends BankingException {
    public ResourceNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", message);
    }

    public ResourceNotFoundException(String resourceType, String identifier) {
        super(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", resourceType + " with identifier '" + identifier + "' was not found.");
    }
}
