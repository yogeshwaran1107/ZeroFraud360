package com.SIH.ZeroFraud360.fraud.hold.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record BankHoldResponseDto(
        String holdId,
        String accountId,
        BigDecimal amount,
        String status,
        Instant expiresAt
) {
}
