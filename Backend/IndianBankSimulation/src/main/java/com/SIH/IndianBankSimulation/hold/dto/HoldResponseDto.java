package com.SIH.IndianBankSimulation.hold.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record HoldResponseDto(
        String holdId,
        String accountId,
        String transactionId,
        String alertId,
        BigDecimal amount,
        String currency,
        String reasonCode,
        String source,
        String status,
        Instant createdAt,
        Instant expiresAt,
        Instant releasedAt,
        String releaseReason
) {
}
