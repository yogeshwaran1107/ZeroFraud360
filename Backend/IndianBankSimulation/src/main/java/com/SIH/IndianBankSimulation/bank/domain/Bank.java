package com.SIH.IndianBankSimulation.bank.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "banks")
public class Bank {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bank_code", nullable = false, unique = true, length = 20)
    private String bankCode;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "ifsc_prefix", nullable = false, unique = true, length = 11)
    private String ifscPrefix;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Bank() {
    }

    public Bank(String bankCode, String name, String ifscPrefix, boolean active) {
        this.bankCode = bankCode;
        this.name = name;
        this.ifscPrefix = ifscPrefix;
        this.active = active;
        this.createdAt = Instant.now();
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
