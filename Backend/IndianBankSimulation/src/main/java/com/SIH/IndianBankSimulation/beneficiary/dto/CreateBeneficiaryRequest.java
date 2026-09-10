package com.SIH.IndianBankSimulation.beneficiary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBeneficiaryRequest(
        @NotBlank(message = "Beneficiary name is required")
        @Size(max = 150)
        String beneficiaryName,

        @NotBlank(message = "Account number is required")
        @Size(max = 30)
        String accountNumber,

        String ifsc,

        String bankName,

        String upiId
) {
}
