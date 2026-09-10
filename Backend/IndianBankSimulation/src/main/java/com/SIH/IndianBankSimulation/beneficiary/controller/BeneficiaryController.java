package com.SIH.IndianBankSimulation.beneficiary.controller;

import com.SIH.IndianBankSimulation.beneficiary.dto.BeneficiaryDto;
import com.SIH.IndianBankSimulation.beneficiary.dto.CreateBeneficiaryRequest;
import com.SIH.IndianBankSimulation.beneficiary.service.BeneficiaryService;
import com.SIH.IndianBankSimulation.common.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/beneficiaries")
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    public BeneficiaryController(BeneficiaryService beneficiaryService) {
        this.beneficiaryService = beneficiaryService;
    }

    @GetMapping
    public ResponseEntity<List<BeneficiaryDto>> getMyBeneficiaries(@AuthenticationPrincipal UserPrincipal principal) {
        List<BeneficiaryDto> beneficiaries = beneficiaryService.getBeneficiariesForUser(principal.getId());
        return ResponseEntity.ok(beneficiaries);
    }

    @PostMapping
    public ResponseEntity<BeneficiaryDto> addBeneficiary(
            @Valid @RequestBody CreateBeneficiaryRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        BeneficiaryDto beneficiary = beneficiaryService.addBeneficiary(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(beneficiary);
    }
}
