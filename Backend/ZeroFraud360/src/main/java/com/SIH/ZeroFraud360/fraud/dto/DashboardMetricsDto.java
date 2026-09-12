package com.SIH.ZeroFraud360.fraud.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardMetricsDto(
        long totalTransactions,
        BigDecimal totalAmount,
        long flaggedAlerts,
        long activeHolds,
        long affectedAccounts,
        long normalTransactions,
        long suspiciousTransactions,
        double normalPercentage,
        double suspiciousPercentage,
        List<HourlyBinDto> timeBins
) {
    public record HourlyBinDto(
            String label,
            long count,
            long alertCount,
            BigDecimal totalAmount
    ) {}
}
