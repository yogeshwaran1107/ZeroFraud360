package com.SIH.IndianBankSimulation.payment.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentTransferResponse(
        String transactionId,
        String senderAccountNumber,
        String receiverAccountNumber,
        BigDecimal amount,
        String currency,
        String status,
        Instant occurredAt
) {
}
