package com.SIH.ZeroFraud360.fraud.decision.dto;

public record DecisionApiResponseDto(
        String requestId,
        String decision,
        String reason
) {
}
