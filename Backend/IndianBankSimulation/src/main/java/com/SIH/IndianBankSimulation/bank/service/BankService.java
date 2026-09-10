package com.SIH.IndianBankSimulation.bank.service;

import com.SIH.IndianBankSimulation.bank.domain.Bank;
import com.SIH.IndianBankSimulation.bank.dto.BankDto;
import com.SIH.IndianBankSimulation.bank.repository.BankRepository;
import com.SIH.IndianBankSimulation.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BankService {

    private final BankRepository bankRepository;

    public BankService(BankRepository bankRepository) {
        this.bankRepository = bankRepository;
    }

    @Transactional(readOnly = true)
    public List<BankDto> getAllActiveBanks() {
        return bankRepository.findAll().stream()
                .filter(Bank::isActive)
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public BankDto getBankByCode(String bankCode) {
        Bank bank = bankRepository.findByBankCode(bankCode)
                .orElseThrow(() -> new ResourceNotFoundException("Bank", bankCode));
        return toDto(bank);
    }

    private BankDto toDto(Bank bank) {
        return new BankDto(bank.getId(), bank.getBankCode(), bank.getName(), bank.getIfscPrefix(), bank.isActive());
    }
}
