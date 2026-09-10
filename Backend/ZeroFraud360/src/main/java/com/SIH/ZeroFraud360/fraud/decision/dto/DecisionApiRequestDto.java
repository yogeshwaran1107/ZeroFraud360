package com.SIH.ZeroFraud360.fraud.decision.dto;

import java.math.BigDecimal;

public record DecisionApiRequestDto(
        String requestId,
        String alertId,
        String patternType,
        DecisionApiTransactionDto firstTransaction,
        DecisionApiTransactionDto secondTransaction,
        long timeDifferenceSeconds,
        String message
) {
}
