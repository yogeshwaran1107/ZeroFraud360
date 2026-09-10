package com.SIH.ZeroFraud360.fraud.dto;

import com.SIH.ZeroFraud360.fraud.domain.FraudPattern;
import java.math.BigDecimal;
import java.time.Instant;

public record FraudPatternDto(
        Long id,
        String patternId,
        String patternName,
        String patternType,
        String description,
        String riskLevel,
        String sourceAccount,
        String muleAccount,
        String destinationAccount,
        BigDecimal minAmount,
        BigDecimal maxAmount,
        Integer timeWindowSeconds,
        String actionTaken,
        String confirmedByOfficer,
        String alertId,
        String status,
        Instant createdAt
) {
    public static FraudPatternDto fromEntity(FraudPattern entity) {
        return new FraudPatternDto(
                entity.getId(),
                entity.getPatternId(),
                entity.getPatternName(),
                entity.getPatternType(),
                entity.getDescription(),
                entity.getRiskLevel(),
                entity.getSourceAccount(),
                entity.getMuleAccount(),
                entity.getDestinationAccount(),
                entity.getMinAmount(),
                entity.getMaxAmount(),
                entity.getTimeWindowSeconds(),
                entity.getActionTaken(),
                entity.getConfirmedByOfficer(),
                entity.getAlertId(),
                entity.getStatus(),
                entity.getCreatedAt()
        );
    }
}
