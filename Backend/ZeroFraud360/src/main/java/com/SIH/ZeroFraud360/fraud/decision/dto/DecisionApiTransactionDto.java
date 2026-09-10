package com.SIH.ZeroFraud360.fraud.decision.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record DecisionApiTransactionDto(
        String transactionId,
        String senderAccountId,
        String receiverAccountId,
        BigDecimal amount,
        String currency,
        Instant occurredAt
) {
}
