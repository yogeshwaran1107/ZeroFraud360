package com.SIH.IndianBankSimulation.payment.repository;

import com.SIH.IndianBankSimulation.payment.domain.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    Optional<PaymentTransaction> findByTransactionId(String transactionId);

    List<PaymentTransaction> findBySenderAccountIdOrReceiverAccountIdOrderByOccurredAtDesc(String senderAccountId, String receiverAccountId);
}
