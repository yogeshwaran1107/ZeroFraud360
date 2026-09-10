package com.SIH.IndianBankSimulation.account.dto;

import java.math.BigDecimal;

/**
 * Public account summary DTO.
 * Strictly adheres to Section 3: Never exposes raw password, UPI PIN, or PIN hash.
 */
public class AccountResponseDto {

    private Long id;
    private String accountNumber;
    private String ifsc;
    private String bankCode;
    private String bankName;
    private String customerName;
    private String currency;
    private String status;
    private BigDecimal availableBalance;
    private String upiId;

    public AccountResponseDto() {
    }

    public AccountResponseDto(Long id, String accountNumber, String ifsc, String bankCode, String bankName,
                              String customerName, String currency, String status, BigDecimal availableBalance, String upiId) {
        this.id = id;
        this.accountNumber = accountNumber;
        this.ifsc = ifsc;
        this.bankCode = bankCode;
        this.bankName = bankName;
        this.customerName = customerName;
        this.currency = currency;
        this.status = status;
        this.availableBalance = availableBalance;
        this.upiId = upiId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getIfsc() {
        return ifsc;
    }

    public void setIfsc(String ifsc) {
        this.ifsc = ifsc;
    }

    public String getBankCode() {
        return bankCode;
    }

    public void setBankCode(String bankCode) {
        this.bankCode = bankCode;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getAvailableBalance() {
        return availableBalance;
    }

    public void setAvailableBalance(BigDecimal availableBalance) {
        this.availableBalance = availableBalance;
    }

    public String getUpiId() {
        return upiId;
    }

    public void setUpiId(String upiId) {
        this.upiId = upiId;
    }
}
