package com.SIH.ZeroFraud360.fraud.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record AccountForensicsDto(
        String accountNumber,
        String customerName,
        String bankCode,
        String bankName,
        String status,
        BigDecimal availableBalance,
        String currency,
        int riskScore,
        String riskLevel,
        ForensicsSummary summary,
        List<WithdrawalModeStat> modeBreakdowns,
        List<LocationWithdrawalStat> locations,
        List<GeoVelocityAlert> velocityAlerts,
        List<ForensicTransactionItem> auditLedger
) {

    public record ForensicsSummary(
            BigDecimal totalWithdrawalsAmount,
            int totalWithdrawalsCount,
            BigDecimal totalInflowAmount,
            int totalInflowCount,
            BigDecimal highestSingleWithdrawal,
            String primaryWithdrawalMode,
            String primaryLocation
    ) {}

    public record WithdrawalModeStat(
            String mode,
            String label,
            BigDecimal totalAmount,
            int count,
            double percentage,
            BigDecimal averageAmount,
            String icon
    ) {}

    public record LocationWithdrawalStat(
            String locationId,
            String city,
            String state,
            String terminalOrBranch,
            double latitude,
            double longitude,
            BigDecimal totalAmount,
            int count,
            Instant lastActivityAt,
            String riskTag
    ) {}

    public record GeoVelocityAlert(
            String alertId,
            String message,
            String fromCity,
            String toCity,
            long timeDifferenceMinutes,
            double distanceKm,
            String severity
    ) {}

    public record ForensicTransactionItem(
            String transactionId,
            Instant timestamp,
            String mode,
            String modeLabel,
            String type,
            BigDecimal amount,
            String city,
            String terminal,
            String counterparty,
            String status,
            String anomalyFlag
    ) {}
}