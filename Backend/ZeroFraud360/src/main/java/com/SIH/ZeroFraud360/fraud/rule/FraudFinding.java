package com.SIH.ZeroFraud360.fraud.rule;

import java.math.BigDecimal;

public record FraudFinding(
        String ruleName,
        String firstTransactionId,
        String secondTransactionId,
        String sourceAccountId,
        String intermediateAccountId,
        String destinationAccountId,
        BigDecimal firstAmount,
        BigDecimal secondAmount,
        long timeDifferenceSeconds,
        String message
) {
}
