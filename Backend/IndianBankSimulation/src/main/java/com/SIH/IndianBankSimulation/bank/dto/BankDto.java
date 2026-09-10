package com.SIH.IndianBankSimulation.bank.dto;

public class BankDto {
    private Long id;
    private String bankCode;
    private String name;
    private String ifscPrefix;
    private boolean active;

    public BankDto() {
    }

    public BankDto(Long id, String bankCode, String name, String ifscPrefix, boolean active) {
        this.id = id;
        this.bankCode = bankCode;
        this.name = name;
        this.ifscPrefix = ifscPrefix;
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBankCode() {
        return bankCode;
    }

    public void setBankCode(String bankCode) {
        this.bankCode = bankCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getIfscPrefix() {
        return ifscPrefix;
    }

    public void setIfscPrefix(String ifscPrefix) {
        this.ifscPrefix = ifscPrefix;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
