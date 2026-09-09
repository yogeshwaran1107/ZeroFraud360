package com.SIH.ZeroFraud360.fraud.hold.dto;

import java.math.BigDecimal;

public record BankHoldRequestDto(
        String requestId,
        String transactionId,
        String alertId,
        BigDecimal amount,
        String currency,
        Integer durationMinutes,
        String reasonCode,
        String source
) {
}
