package com.SIH.IndianBankSimulation.bank.repository;

import com.SIH.IndianBankSimulation.bank.domain.Bank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BankRepository extends JpaRepository<Bank, Long> {
    Optional<Bank> findByBankCode(String bankCode);
    Optional<Bank> findByIfscPrefix(String ifscPrefix);
    boolean existsByBankCode(String bankCode);
}
