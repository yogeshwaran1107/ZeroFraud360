package com.SIH.IndianBankSimulation.beneficiary.repository;

import com.SIH.IndianBankSimulation.beneficiary.domain.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {
    List<Beneficiary> findAllByCustomerIdOrderByCreatedAtDesc(Long customerId);
    Optional<Beneficiary> findByCustomerIdAndAccountNumber(Long customerId, String accountNumber);
    boolean existsByCustomerIdAndAccountNumber(Long customerId, String accountNumber);
}
