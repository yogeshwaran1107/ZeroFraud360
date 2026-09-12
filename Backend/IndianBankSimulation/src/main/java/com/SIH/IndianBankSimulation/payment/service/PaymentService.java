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
    private final org.springframework.web.client.RestTemplate restTemplate;

    @org.springframework.beans.factory.annotation.Value("${bank.zerofraud360.base-url:http://localhost:8081}")
    private String zeroFraudBaseUrl = "http://localhost:8081";

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
        this.restTemplate = new org.springframework.web.client.RestTemplate();
    }

    @Transactional
    public PaymentTransferResponse executePayment(PaymentTransferRequest request) {
        BankAccount sender = accountRepository.findByAccountNumber(request.senderAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Sender account", request.senderAccountNumber()));

        BankAccount receiver = accountRepository.findByAccountNumber(request.receiverAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Receiver account", request.receiverAccountNumber()));

        // Outbound hold check: accounts with active or blocked holds cannot send money
        boolean isSenderBlockedOrFrozen = sender.getStatus() == AccountStatus.FROZEN
                || holdRepository.existsByAccountIdAndStatusIn(sender.getAccountNumber(), java.util.List.of(HoldStatus.ACTIVE, HoldStatus.BLOCKED));
        if (isSenderBlockedOrFrozen) {
            log.warn("Transfer BLOCKED for account {}: Account is on protective hold/frozen", sender.getAccountNumber());
            throw new BankingException(HttpStatus.FORBIDDEN, "ACCOUNT_ON_HOLD",
                    "Your account is currently on protective hold pending fraud investigation. Outbound transfers are suspended.");
        }

        // Inbound hold check: accounts with active or blocked holds cannot receive money
        boolean isReceiverBlockedOrFrozen = receiver.getStatus() == AccountStatus.FROZEN
                || holdRepository.existsByAccountIdAndStatusIn(receiver.getAccountNumber(), java.util.List.of(HoldStatus.ACTIVE, HoldStatus.BLOCKED));
        if (isReceiverBlockedOrFrozen) {
            log.warn("Transfer REJECTED for recipient {}: Beneficiary account is on protective hold/frozen", receiver.getAccountNumber());
            throw new BankingException(HttpStatus.FORBIDDEN, "RECIPIENT_ON_HOLD",
                    "Cannot transfer funds: Beneficiary account is currently on protective hold pending investigation.");
        }

        if (sender.getStatus() != AccountStatus.ACTIVE) {
            throw new BankingException(HttpStatus.BAD_REQUEST, "ACCOUNT_INACTIVE", "Sender account is not active");
        }
        if (receiver.getStatus() != AccountStatus.ACTIVE) {
            throw new BankingException(HttpStatus.BAD_REQUEST, "ACCOUNT_INACTIVE", "Receiver account is not active");
        }

        // Real-Time Pre-Transfer Screening via ZeroFraud360
        try {
            String preCheckUrl = zeroFraudBaseUrl.replaceAll("/+$", "") + "/internal/v1/fraud/pre-check";
            java.util.Map<String, Object> checkBody = java.util.Map.of(
                    "senderAccountId", sender.getAccountNumber(),
                    "receiverAccountId", receiver.getAccountNumber(),
                    "amount", request.amount(),
                    "currency", request.currency() != null ? request.currency() : "INR"
            );
            java.util.Map<?, ?> res = restTemplate.postForObject(preCheckUrl, checkBody, java.util.Map.class);
            if (res != null && Boolean.FALSE.equals(res.get("allowed"))) {
                String reason = res.get("reason") != null ? res.get("reason").toString() : "Security Intercept: Transaction stopped by ZeroFraud360.";
                log.warn("Transaction INTERCEPTED by ZeroFraud360: sender={}, receiver={}, reason={}",
                        sender.getAccountNumber(), receiver.getAccountNumber(), reason);
                throw new BankingException(HttpStatus.FORBIDDEN, "ACCOUNT_ON_HOLD", reason);
            }
        } catch (BankingException be) {
            throw be;
        } catch (Exception ex) {
            log.warn("ZeroFraud360 pre-check unavailable or errored (proceeding): {}", ex.getMessage());
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

    @Transactional
    public PaymentTransferResponse executeTheft(String victimAccountNumber, String recipientAccountNumber, BigDecimal amount, String remarks) {
        BankAccount victim = accountRepository.findByAccountNumber(victimAccountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Victim account", victimAccountNumber));

        BankAccount thief = accountRepository.findByAccountNumber(recipientAccountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Recipient account", recipientAccountNumber));

        if (victim.getAvailableBalance().compareTo(amount) < 0) {
            throw new BankingException(HttpStatus.BAD_REQUEST, "INSUFFICIENT_FUNDS",
                    "Victim account has insufficient balance to drain: ₹" + victim.getAvailableBalance());
        }

        victim.setAvailableBalance(victim.getAvailableBalance().subtract(amount));
        thief.setAvailableBalance(thief.getAvailableBalance().add(amount));
        accountRepository.save(victim);
        accountRepository.save(thief);

        String txnId = "THEFT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        Instant occurredAt = Instant.now();
        String correlationId = CorrelationContext.getCorrelationId();

        PaymentTransaction transaction = new PaymentTransaction(
                txnId,
                victim.getAccountNumber(),
                thief.getAccountNumber(),
                victim.getBank().getBankCode(),
                thief.getBank().getBankCode(),
                amount,
                "INR",
                PaymentStatus.SUCCESS,
                "UNAUTHORIZED_THEFT",
                correlationId,
                remarks != null ? remarks : "UNAUTHORIZED THEFT DRAIN",
                occurredAt
        );
        paymentTransactionRepository.save(transaction);

        String eventId = "EVT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        PaymentSuccessEvent eventPayload = new PaymentSuccessEvent(
                eventId,
                "PAYMENT_SUCCESS",
                txnId,
                occurredAt,
                new AccountParticipantDto("ACC-" + victim.getAccountNumber(), victim.getAccountNumber(), victim.getBank().getBankCode()),
                new AccountParticipantDto("ACC-" + thief.getAccountNumber(), thief.getAccountNumber(), thief.getBank().getBankCode()),
                amount,
                "INR",
                "UNAUTHORIZED_THEFT",
                correlationId,
                remarks != null ? remarks : "UNAUTHORIZED THEFT DRAIN"
        );

        try {
            String payloadJson = objectMapper.writeValueAsString(eventPayload);
            OutboxEvent outboxEvent = new OutboxEvent(eventId, "PAYMENT_SUCCESS", "PAYMENT", txnId, payloadJson);
            outboxEventRepository.save(outboxEvent);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize outbox event for theft", e);
        }

        log.warn("🚨 THEFT SIMULATION EXECUTED: Victim {} drained by ₹{} into recipient {}",
                victim.getAccountNumber(), amount, thief.getAccountNumber());

        return new PaymentTransferResponse(
                txnId,
                victim.getAccountNumber(),
                thief.getAccountNumber(),
                amount,
                "INR",
                PaymentStatus.SUCCESS.name(),
                occurredAt
        );
    }

    @Transactional(readOnly = true)
    public java.util.List<PaymentTransaction> getTransactionsForAccount(String accountNumber) {
        return paymentTransactionRepository.findBySenderAccountIdOrReceiverAccountIdOrderByOccurredAtDesc(accountNumber, accountNumber);
    }
}
