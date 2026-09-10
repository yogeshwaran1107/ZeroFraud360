package com.SIH.IndianBankSimulation.beneficiary.service;

import com.SIH.IndianBankSimulation.account.domain.BankAccount;
import com.SIH.IndianBankSimulation.account.repository.BankAccountRepository;
import com.SIH.IndianBankSimulation.beneficiary.domain.Beneficiary;
import com.SIH.IndianBankSimulation.beneficiary.dto.BeneficiaryDto;
import com.SIH.IndianBankSimulation.beneficiary.dto.CreateBeneficiaryRequest;
import com.SIH.IndianBankSimulation.beneficiary.repository.BeneficiaryRepository;
import com.SIH.IndianBankSimulation.common.exception.DuplicateResourceException;
import com.SIH.IndianBankSimulation.common.exception.ResourceNotFoundException;
import com.SIH.IndianBankSimulation.customer.domain.Customer;
import com.SIH.IndianBankSimulation.customer.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepository;
    private final CustomerRepository customerRepository;
    private final BankAccountRepository bankAccountRepository;

    public BeneficiaryService(BeneficiaryRepository beneficiaryRepository,
                              CustomerRepository customerRepository,
                              BankAccountRepository bankAccountRepository) {
        this.beneficiaryRepository = beneficiaryRepository;
        this.customerRepository = customerRepository;
        this.bankAccountRepository = bankAccountRepository;
    }

    @Transactional(readOnly = true)
    public List<BeneficiaryDto> getBeneficiariesForUser(Long userId) {
        Customer customer = customerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer for user id", String.valueOf(userId)));

        return beneficiaryRepository.findAllByCustomerIdOrderByCreatedAtDesc(customer.getId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public BeneficiaryDto addBeneficiary(Long userId, CreateBeneficiaryRequest request) {
        Customer customer = customerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer for user id", String.valueOf(userId)));

        if (beneficiaryRepository.existsByCustomerIdAndAccountNumber(customer.getId(), request.accountNumber())) {
            throw new DuplicateResourceException("Beneficiary with account number " + request.accountNumber() + " already exists.");
        }

        // Auto-detect IFSC, bank name, upiId from simulated bank accounts if not fully provided
        String ifsc = request.ifsc();
        String bankName = request.bankName();
        String upiId = request.upiId();

        Optional<BankAccount> targetAccountOpt = bankAccountRepository.findByAccountNumber(request.accountNumber());
        if (targetAccountOpt.isPresent()) {
            BankAccount targetAcc = targetAccountOpt.get();
            if (ifsc == null || ifsc.isBlank()) {
                ifsc = targetAcc.getIfsc();
            }
            if (bankName == null || bankName.isBlank()) {
                bankName = targetAcc.getBank() != null ? targetAcc.getBank().getName() : "Simulated Bank";
            }
            if (upiId == null || upiId.isBlank()) {
                upiId = targetAcc.getUpiId();
            }
        } else {
            if (ifsc == null || ifsc.isBlank()) {
                ifsc = "SIMU000001";
            }
            if (bankName == null || bankName.isBlank()) {
                bankName = "Simulated Partner Bank";
            }
        }

        Beneficiary beneficiary = new Beneficiary(
                customer,
                request.beneficiaryName(),
                request.accountNumber(),
                ifsc,
                bankName,
                upiId
        );

        Beneficiary saved = beneficiaryRepository.save(beneficiary);
        return toDto(saved);
    }

    public BeneficiaryDto toDto(Beneficiary b) {
        return new BeneficiaryDto(
                b.getId(),
                b.getBeneficiaryName(),
                b.getAccountNumber(),
                b.getIfsc(),
                b.getBankName(),
                b.getUpiId(),
                b.getCreatedAt()
        );
    }
}
