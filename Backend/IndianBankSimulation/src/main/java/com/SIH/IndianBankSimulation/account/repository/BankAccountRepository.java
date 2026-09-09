package com.SIH.IndianBankSimulation.account.repository;

import com.SIH.IndianBankSimulation.account.domain.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {
    Optional<BankAccount> findByAccountNumber(String accountNumber);
    Optional<BankAccount> findByUpiId(String upiId);
    List<BankAccount> findAllByCustomerId(Long customerId);
    boolean existsByAccountNumber(String accountNumber);
    boolean existsByUpiId(String upiId);
}
