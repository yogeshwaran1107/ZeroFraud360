package com.SIH.IndianBankSimulation.hold.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CreateHoldRequest(
        @NotBlank(message = "requestId is required")
        String requestId,

        String transactionId,

        String alertId,

        @NotNull(message = "amount is required")
        @DecimalMin(value = "0.01", message = "amount must be greater than 0")
        BigDecimal amount,

        String currency,

        Integer durationMinutes,

        String reasonCode,

        String source
) {
}
