package com.SIH.IndianBankSimulation.payment.service;

import com.SIH.IndianBankSimulation.account.domain.AccountStatus;
import com.SIH.IndianBankSimulation.account.domain.BankAccount;
import com.SIH.IndianBankSimulation.account.repository.BankAccountRepository;
import com.SIH.IndianBankSimulation.common.correlation.CorrelationContext;
import com.SIH.IndianBankSimulation.common.exception.BankingException;
import com.SIH.IndianBankSimulation.common.exception.ResourceNotFoundException;
import com.SIH.IndianBankSimulation.hold.domain.HoldStatus;
import com.SIH.IndianBankSimulation.hold.repository.AccountHoldRepository;
import com.SIH.IndianBankSimulation.outbox.domain.OutboxEvent;
import com.SIH.IndianBankSimulation.outbox.dto.AccountParticipantDto;
import com.SIH.IndianBankSimulation.outbox.dto.PaymentSuccessEvent;
import com.SIH.IndianBankSimulation.outbox.repository.OutboxEventRepository;
import com.SIH.IndianBankSimulation.payment.domain.PaymentStatus;
import com.SIH.IndianBankSimulation.payment.domain.PaymentTransaction;
import com.SIH.IndianBankSimulation.payment.dto.PaymentTransferRequest;
import com.SIH.IndianBankSimulation.payment.dto.PaymentTransferResponse;
import com.SIH.IndianBankSimulation.payment.repository.PaymentTransactionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final BankAccountRepository accountRepository;
    private final AccountHoldRepository holdRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    public PaymentService(BankAccountRepository accountRepository,
                          AccountHoldRepository holdRepository,
                          PaymentTransactionRepository paymentTransactionRepository,
                          OutboxEventRepository outboxEventRepository,
                          PasswordEncoder passwordEncoder,
                          ObjectMapper objectMapper) {
        this.accountRepository = accountRepository;
        this.holdRepository = holdRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PaymentTransferResponse executePayment(PaymentTransferRequest request) {
        BankAccount sender = accountRepository.findByAccountNumber(request.senderAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Sender account", request.senderAccountNumber()));

        BankAccount receiver = accountRepository.findByAccountNumber(request.receiverAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Receiver account", request.receiverAccountNumber()));

        if (sender.getStatus() != AccountStatus.ACTIVE) {
            throw new BankingException(HttpStatus.BAD_REQUEST, "ACCOUNT_INACTIVE", "Sender account is not active");
        }
        if (receiver.getStatus() != AccountStatus.ACTIVE) {
            throw new BankingException(HttpStatus.BAD_REQUEST, "ACCOUNT_INACTIVE", "Receiver account is not active");
        }

        // Optional PIN validation if provided
        if (request.upiPin() != null && !request.upiPin().isBlank()) {
            if (!passwordEncoder.matches(request.upiPin(), sender.getUpiPinHash())) {
                throw new BankingException(HttpStatus.UNAUTHORIZED, "INVALID_PIN", "Invalid UPI PIN");
            }
        }

        // Available balance check taking active holds into account
        BigDecimal activeHolds = holdRepository.sumActiveHoldAmount(sender.getAccountNumber(), HoldStatus.ACTIVE);
        BigDecimal availableBalance = sender.getAvailableBalance().subtract(activeHolds != null ? activeHolds : BigDecimal.ZERO);

        if (availableBalance.compareTo(request.amount()) < 0) {
            throw new BankingException(HttpStatus.BAD_REQUEST, "INSUFFICIENT_AVAILABLE_FUNDS",
                    String.format("Insufficient available balance. Ledger: %s, Active Holds: %s, Available: %s, Requested: %s",
                            sender.getAvailableBalance(), activeHolds, availableBalance, request.amount()));
        }

        // Atomic debit and credit
        sender.setAvailableBalance(sender.getAvailableBalance().subtract(request.amount()));
        receiver.setAvailableBalance(receiver.getAvailableBalance().add(request.amount()));

        accountRepository.save(sender);
        accountRepository.save(receiver);

        // Record payment transaction
        String txnId = "TXN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        Instant occurredAt = request.occurredAt() != null ? request.occurredAt() : Instant.now();
        String correlationId = CorrelationContext.getCorrelationId();

        PaymentTransaction transaction = new PaymentTransaction(
                txnId,
                sender.getAccountNumber(),
                receiver.getAccountNumber(),
                sender.getBank().getBankCode(),
                receiver.getBank().getBankCode(),
                request.amount(),
                request.currency() != null ? request.currency() : "INR",
                PaymentStatus.SUCCESS,
                request.paymentRail() != null ? request.paymentRail() : "SIMULATED_UPI",
                correlationId,
                request.messageId(),
                occurredAt
        );
        paymentTransactionRepository.save(transaction);

        // Record outbox event for durable event publishing
        String eventId = "EVT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        PaymentSuccessEvent eventPayload = new PaymentSuccessEvent(
                eventId,
                "PAYMENT_SUCCESS",
                txnId,
                occurredAt,
                new AccountParticipantDto("ACC-" + sender.getAccountNumber(), sender.getAccountNumber(), sender.getBank().getBankCode()),
                new AccountParticipantDto("ACC-" + receiver.getAccountNumber(), receiver.getAccountNumber(), receiver.getBank().getBankCode()),
                request.amount(),
                transaction.getCurrency(),
                transaction.getPaymentRail(),
                correlationId,
                request.messageId()
        );

        try {
            String payloadJson = objectMapper.writeValueAsString(eventPayload);
            OutboxEvent outboxEvent = new OutboxEvent(eventId, "PAYMENT_SUCCESS", "PAYMENT", txnId, payloadJson);
            outboxEventRepository.save(outboxEvent);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize PaymentSuccessEvent", e);
            throw new RuntimeException("Failed to serialize outbox event", e);
        }

        log.info("Payment succeeded: txnId={}, from {} to {}, amount={}, occurredAt={}",
                txnId, sender.getAccountNumber(), receiver.getAccountNumber(), request.amount(), occurredAt);

        return new PaymentTransferResponse(
                txnId,
                sender.getAccountNumber(),
                receiver.getAccountNumber(),
                request.amount(),
                transaction.getCurrency(),
                PaymentStatus.SUCCESS.name(),
                occurredAt
        );
    }

    @Transactional(readOnly = true)
    public java.util.List<PaymentTransaction> getTransactionsForAccount(String accountNumber) {
        return paymentTransactionRepository.findBySenderAccountIdOrReceiverAccountIdOrderByOccurredAtDesc(accountNumber, accountNumber);
    }
}
