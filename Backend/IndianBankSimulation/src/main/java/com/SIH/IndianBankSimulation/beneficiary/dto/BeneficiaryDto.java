package com.SIH.IndianBankSimulation.beneficiary.dto;

import java.time.Instant;

public record BeneficiaryDto(
        Long id,
        String beneficiaryName,
        String accountNumber,
        String ifsc,
        String bankName,
        String upiId,
        Instant createdAt
) {
}
