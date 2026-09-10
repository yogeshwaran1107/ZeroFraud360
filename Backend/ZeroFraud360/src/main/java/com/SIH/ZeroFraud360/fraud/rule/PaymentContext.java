package com.SIH.ZeroFraud360.fraud.rule;

import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;

import java.util.List;

public record PaymentContext(
        ObservedTransaction currentTransaction,
        List<ObservedTransaction> candidatePriorTransactions
) {
}
