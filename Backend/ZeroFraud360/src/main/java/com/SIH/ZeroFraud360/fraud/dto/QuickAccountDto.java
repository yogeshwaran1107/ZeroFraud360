package com.SIH.ZeroFraud360.fraud.dto;

import java.math.BigDecimal;

public record QuickAccountDto(
        String accountNumber,
        String customerName,
        String bankCode,
        String status,
        BigDecimal availableBalance
) {
}