package com.SIH.IndianBankSimulation.hold.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "account_holds")
public class AccountHold {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hold_id", nullable = false, unique = true, length = 64)
    private String holdId;

    @Column(name = "account_id", nullable = false, length = 30)
    private String accountId;

    @Column(name = "transaction_id", length = 64)
    private String transactionId;

    @Column(name = "alert_id", length = 64)
    private String alertId;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "reason_code", nullable = false, length = 50)
    private String reasonCode = "FRAUD_ALERT";

    @Column(nullable = false, length = 50)
    private String source = "ZERO_FRAUD_360";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private HoldStatus status = HoldStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "released_at")
    private Instant releasedAt;

    @Column(name = "release_reason", length = 255)
    private String releaseReason;

    @Version
    @Column(nullable = false)
    private Long version = 0L;

    public AccountHold() {
    }

    public AccountHold(String holdId, String accountId, String transactionId, String alertId,
                       BigDecimal amount, String currency, String reasonCode, String source,
                       Instant expiresAt) {
        this.holdId = holdId;
        this.accountId = accountId;
        this.transactionId = transactionId;
        this.alertId = alertId;
        this.amount = amount;
        this.currency = currency != null ? currency : "INR";
        this.reasonCode = reasonCode != null ? reasonCode : "FRAUD_ALERT";
        this.source = source != null ? source : "ZERO_FRAUD_360";
        this.status = HoldStatus.ACTIVE;
        this.createdAt = Instant.now();
        this.expiresAt = expiresAt;
        this.version = 0L;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getHoldId() {
        return holdId;
    }

    public void setHoldId(String holdId) {
        this.holdId = holdId;
    }

    public String getAccountId() {
        return accountId;
    }

    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getAlertId() {
        return alertId;
    }

    public void setAlertId(String alertId) {
        this.alertId = alertId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getReasonCode() {
        return reasonCode;
    }

    public void setReasonCode(String reasonCode) {
        this.reasonCode = reasonCode;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public HoldStatus getStatus() {
        return status;
    }

    public void setStatus(HoldStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getReleasedAt() {
        return releasedAt;
    }

    public void setReleasedAt(Instant releasedAt) {
        this.releasedAt = releasedAt;
    }

    public String getReleaseReason() {
        return releaseReason;
    }

    public void setReleaseReason(String releaseReason) {
        this.releaseReason = releaseReason;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
