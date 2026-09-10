package com.SIH.ZeroFraud360.event.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "observed_transactions")
public class ObservedTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, length = 64)
    private String eventId;

    @Column(name = "transaction_id", nullable = false, length = 64)
    private String transactionId;

    @Column(name = "sender_account_id", nullable = false, length = 30)
    private String senderAccountId;

    @Column(name = "receiver_account_id", nullable = false, length = 30)
    private String receiverAccountId;

    @Column(name = "sender_bank_id", nullable = false, length = 20)
    private String senderBankId;

    @Column(name = "receiver_bank_id", nullable = false, length = 20)
    private String receiverBankId;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "payment_rail", nullable = false, length = 30)
    private String paymentRail = "SIMULATED_UPI";

    @Column(nullable = false, length = 30)
    private String status = "SUCCESS";

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @Column(name = "message_id", length = 64)
    private String messageId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ObservedTransaction() {
    }

    public ObservedTransaction(String eventId, String transactionId, String senderAccountId,
                               String receiverAccountId, String senderBankId, String receiverBankId,
                               BigDecimal amount, String currency, String paymentRail,
                               String status, String correlationId, String messageId, Instant occurredAt) {
        this.eventId = eventId;
        this.transactionId = transactionId;
        this.senderAccountId = senderAccountId;
        this.receiverAccountId = receiverAccountId;
        this.senderBankId = senderBankId;
        this.receiverBankId = receiverBankId;
        this.amount = amount;
        this.currency = currency != null ? currency : "INR";
        this.paymentRail = paymentRail != null ? paymentRail : "SIMULATED_UPI";
        this.status = status != null ? status : "SUCCESS";
        this.correlationId = correlationId;
        this.messageId = messageId;
        this.occurredAt = occurredAt;
        this.receivedAt = Instant.now();
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEventId() {
        return eventId;
    }

    public void setEventId(String eventId) {
        this.eventId = eventId;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getSenderAccountId() {
        return senderAccountId;
    }

    public void setSenderAccountId(String senderAccountId) {
        this.senderAccountId = senderAccountId;
    }

    public String getReceiverAccountId() {
        return receiverAccountId;
    }

    public void setReceiverAccountId(String receiverAccountId) {
        this.receiverAccountId = receiverAccountId;
    }

    public String getSenderBankId() {
        return senderBankId;
    }

    public void setSenderBankId(String senderBankId) {
        this.senderBankId = senderBankId;
    }

    public String getReceiverBankId() {
        return receiverBankId;
    }

    public void setReceiverBankId(String receiverBankId) {
        this.receiverBankId = receiverBankId;
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

    public String getPaymentRail() {
        return paymentRail;
    }

    public void setPaymentRail(String paymentRail) {
        this.paymentRail = paymentRail;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }

    public String getMessageId() {
        return messageId;
    }

    public void setMessageId(String messageId) {
        this.messageId = messageId;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }

    public Instant getReceivedAt() {
        return receivedAt;
    }

    public void setReceivedAt(Instant receivedAt) {
        this.receivedAt = receivedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
