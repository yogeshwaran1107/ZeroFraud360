package com.SIH.ZeroFraud360.fraud.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "fraud_patterns")
public class FraudPattern {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pattern_id", nullable = false, unique = true, length = 64)
    private String patternId;

    @Column(name = "pattern_name", nullable = false, length = 150)
    private String patternName;

    @Column(name = "pattern_type", nullable = false, length = 64)
    private String patternType = "RAPID_PASS_THROUGH";

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "risk_level", nullable = false, length = 20)
    private String riskLevel = "HIGH";

    @Column(name = "source_account", length = 30)
    private String sourceAccount;

    @Column(name = "mule_account", length = 30)
    private String muleAccount;

    @Column(name = "destination_account", length = 30)
    private String destinationAccount;

    @Column(name = "min_amount", precision = 19, scale = 4)
    private BigDecimal minAmount;

    @Column(name = "max_amount", precision = 19, scale = 4)
    private BigDecimal maxAmount;

    @Column(name = "time_window_seconds")
    private Integer timeWindowSeconds = 180;

    @Column(name = "action_taken", nullable = false, length = 50)
    private String actionTaken = "CONFIRMED_FRAUD_BLOCK";

    @Column(name = "confirmed_by_officer", length = 50)
    private String confirmedByOfficer;

    @Column(name = "alert_id", length = 64)
    private String alertId;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public FraudPattern() {
    }

    public FraudPattern(String patternId, String patternName, String patternType, String description,
                        String riskLevel, String sourceAccount, String muleAccount, String destinationAccount,
                        BigDecimal minAmount, BigDecimal maxAmount, Integer timeWindowSeconds,
                        String actionTaken, String confirmedByOfficer, String alertId) {
        this.patternId = patternId;
        this.patternName = patternName;
        this.patternType = patternType != null ? patternType : "RAPID_PASS_THROUGH";
        this.description = description;
        this.riskLevel = riskLevel != null ? riskLevel : "HIGH";
        this.sourceAccount = sourceAccount;
        this.muleAccount = muleAccount;
        this.destinationAccount = destinationAccount;
        this.minAmount = minAmount;
        this.maxAmount = maxAmount;
        this.timeWindowSeconds = timeWindowSeconds != null ? timeWindowSeconds : 180;
        this.actionTaken = actionTaken != null ? actionTaken : "CONFIRMED_FRAUD_BLOCK";
        this.confirmedByOfficer = confirmedByOfficer;
        this.alertId = alertId;
        this.status = "ACTIVE";
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getPatternId() { return patternId; }
    public void setPatternId(String patternId) { this.patternId = patternId; }
    public String getPatternName() { return patternName; }
    public void setPatternName(String patternName) { this.patternName = patternName; }
    public String getPatternType() { return patternType; }
    public void setPatternType(String patternType) { this.patternType = patternType; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    public String getSourceAccount() { return sourceAccount; }
    public void setSourceAccount(String sourceAccount) { this.sourceAccount = sourceAccount; }
    public String getMuleAccount() { return muleAccount; }
    public void setMuleAccount(String muleAccount) { this.muleAccount = muleAccount; }
    public String getDestinationAccount() { return destinationAccount; }
    public void setDestinationAccount(String destinationAccount) { this.destinationAccount = destinationAccount; }
    public BigDecimal getMinAmount() { return minAmount; }
    public void setMinAmount(BigDecimal minAmount) { this.minAmount = minAmount; }
    public BigDecimal getMaxAmount() { return maxAmount; }
    public void setMaxAmount(BigDecimal maxAmount) { this.maxAmount = maxAmount; }
    public Integer getTimeWindowSeconds() { return timeWindowSeconds; }
    public void setTimeWindowSeconds(Integer timeWindowSeconds) { this.timeWindowSeconds = timeWindowSeconds; }
    public String getActionTaken() { return actionTaken; }
    public void setActionTaken(String actionTaken) { this.actionTaken = actionTaken; }
    public String getConfirmedByOfficer() { return confirmedByOfficer; }
    public void setConfirmedByOfficer(String confirmedByOfficer) { this.confirmedByOfficer = confirmedByOfficer; }
    public String getAlertId() { return alertId; }
    public void setAlertId(String alertId) { this.alertId = alertId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
