package com.SIH.IndianBankSimulation.hold.dto;

import jakarta.validation.constraints.NotBlank;

public record ReleaseHoldRequest(
        String officerId,

        @NotBlank(message = "reason is required")
        String reason
) {
}
