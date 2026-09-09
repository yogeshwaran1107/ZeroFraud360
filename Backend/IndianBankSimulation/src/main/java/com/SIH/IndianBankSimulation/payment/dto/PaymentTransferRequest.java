package com.SIH.IndianBankSimulation.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

public record PaymentTransferRequest(
        @NotBlank(message = "senderAccountNumber is required")
        String senderAccountNumber,

        @NotBlank(message = "receiverAccountNumber is required")
        String receiverAccountNumber,

        @NotNull(message = "amount is required")
        @DecimalMin(value = "0.01", message = "amount must be greater than 0")
        BigDecimal amount,

        String currency,

        String upiPin,

        String paymentRail,

        String messageId,

        Instant occurredAt
) {
}
