package com.SIH.ZeroFraud360.fraud.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "fraud_alerts")
public class FraudAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "alert_id", nullable = false, unique = true, length = 64)
    private String alertId;

    @Column(name = "dedup_key", nullable = false, unique = true, length = 150)
    private String dedupKey;

    @Column(name = "pattern_type", nullable = false, length = 64)
    private String patternType = "RAPID_PASS_THROUGH";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AlertStatus status = AlertStatus.CREATED;

    @Column(name = "first_transaction_id", nullable = false, length = 64)
    private String firstTransactionId;

    @Column(name = "second_transaction_id", nullable = false, length = 64)
    private String secondTransactionId;

    @Column(name = "source_account_id", nullable = false, length = 30)
    private String sourceAccountId;

    @Column(name = "intermediate_account_id", nullable = false, length = 30)
    private String intermediateAccountId;

    @Column(name = "destination_account_id", nullable = false, length = 30)
    private String destinationAccountId;

    @Column(name = "first_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal firstAmount;

    @Column(name = "second_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal secondAmount;

    @Column(name = "time_difference_seconds", nullable = false)
    private Long timeDifferenceSeconds;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DecisionType decision;

    @Column(name = "decision_reason", length = 500)
    private String decisionReason;

    @Column(name = "external_decision_request_id", length = 64)
    private String externalDecisionRequestId;

    @Column(name = "hold_request_id", length = 64)
    private String holdRequestId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    public FraudAlert() {
    }

    public FraudAlert(String alertId, String dedupKey, String patternType, AlertStatus status,
                      String firstTransactionId, String secondTransactionId,
                      String sourceAccountId, String intermediateAccountId, String destinationAccountId,
                      BigDecimal firstAmount, BigDecimal secondAmount, Long timeDifferenceSeconds) {
        this.alertId = alertId;
        this.dedupKey = dedupKey;
        this.patternType = patternType != null ? patternType : "RAPID_PASS_THROUGH";
        this.status = status != null ? status : AlertStatus.CREATED;
        this.firstTransactionId = firstTransactionId;
        this.secondTransactionId = secondTransactionId;
        this.sourceAccountId = sourceAccountId;
        this.intermediateAccountId = intermediateAccountId;
        this.destinationAccountId = destinationAccountId;
        this.firstAmount = firstAmount;
        this.secondAmount = secondAmount;
        this.timeDifferenceSeconds = timeDifferenceSeconds;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAlertId() {
        return alertId;
    }

    public void setAlertId(String alertId) {
        this.alertId = alertId;
    }

    public String getDedupKey() {
        return dedupKey;
    }

    public void setDedupKey(String dedupKey) {
        this.dedupKey = dedupKey;
    }

    public String getPatternType() {
        return patternType;
    }

    public void setPatternType(String patternType) {
        this.patternType = patternType;
    }

    public AlertStatus getStatus() {
        return status;
    }

    public void setStatus(AlertStatus status) {
        this.status = status;
    }

    public String getFirstTransactionId() {
        return firstTransactionId;
    }

    public void setFirstTransactionId(String firstTransactionId) {
        this.firstTransactionId = firstTransactionId;
    }

    public String getSecondTransactionId() {
        return secondTransactionId;
    }

    public void setSecondTransactionId(String secondTransactionId) {
        this.secondTransactionId = secondTransactionId;
    }

    public String getSourceAccountId() {
        return sourceAccountId;
    }

    public void setSourceAccountId(String sourceAccountId) {
        this.sourceAccountId = sourceAccountId;
    }

    public String getIntermediateAccountId() {
        return intermediateAccountId;
    }

    public void setIntermediateAccountId(String intermediateAccountId) {
        this.intermediateAccountId = intermediateAccountId;
    }

    public String getDestinationAccountId() {
        return destinationAccountId;
    }

    public void setDestinationAccountId(String destinationAccountId) {
        this.destinationAccountId = destinationAccountId;
    }

    public BigDecimal getFirstAmount() {
        return firstAmount;
    }

    public void setFirstAmount(BigDecimal firstAmount) {
        this.firstAmount = firstAmount;
    }

    public BigDecimal getSecondAmount() {
        return secondAmount;
    }

    public void setSecondAmount(BigDecimal secondAmount) {
        this.secondAmount = secondAmount;
    }

    public Long getTimeDifferenceSeconds() {
        return timeDifferenceSeconds;
    }

    public void setTimeDifferenceSeconds(Long timeDifferenceSeconds) {
        this.timeDifferenceSeconds = timeDifferenceSeconds;
    }

    public DecisionType getDecision() {
        return decision;
    }

    public void setDecision(DecisionType decision) {
        this.decision = decision;
    }

    public String getDecisionReason() {
        return decisionReason;
    }

    public void setDecisionReason(String decisionReason) {
        this.decisionReason = decisionReason;
    }

    public String getExternalDecisionRequestId() {
        return externalDecisionRequestId;
    }

    public void setExternalDecisionRequestId(String externalDecisionRequestId) {
        this.externalDecisionRequestId = externalDecisionRequestId;
    }

    public String getHoldRequestId() {
        return holdRequestId;
    }

    public void setHoldRequestId(String holdRequestId) {
        this.holdRequestId = holdRequestId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(Instant resolvedAt) {
        this.resolvedAt = resolvedAt;
    }
}
