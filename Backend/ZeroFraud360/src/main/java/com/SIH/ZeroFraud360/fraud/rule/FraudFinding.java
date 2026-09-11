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
        String message,
        String riskLevel,
        int chainDepth
) {
    public FraudFinding(
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
        this(ruleName, firstTransactionId, secondTransactionId, sourceAccountId, intermediateAccountId,
                destinationAccountId, firstAmount, secondAmount, timeDifferenceSeconds, message, "CRITICAL", 2);
    }
}
