package com.SIH.IndianBankSimulation.hold.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CreateHoldResponse(
        String holdId,
        String accountId,
        BigDecimal amount,
        String status,
        Instant expiresAt
) {
}
