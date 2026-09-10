package com.SIH.IndianBankSimulation.account.dto;

import java.math.BigDecimal;

public class AccountBalanceDto {

    private String accountNumber;
    private String upiId;
    private String currency;
    private BigDecimal availableBalance;

    public AccountBalanceDto() {
    }

    public AccountBalanceDto(String accountNumber, String upiId, String currency, BigDecimal availableBalance) {
        this.accountNumber = accountNumber;
        this.upiId = upiId;
        this.currency = currency;
        this.availableBalance = availableBalance;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getUpiId() {
        return upiId;
    }

    public void setUpiId(String upiId) {
        this.upiId = upiId;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public BigDecimal getAvailableBalance() {
        return availableBalance;
    }

    public void setAvailableBalance(BigDecimal availableBalance) {
        this.availableBalance = availableBalance;
    }
}
