package com.SIH.ZeroFraud360.fraud.controller;

import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import com.SIH.ZeroFraud360.event.repository.ObservedTransactionRepository;
import com.SIH.ZeroFraud360.fraud.domain.AlertStatus;
import com.SIH.ZeroFraud360.fraud.domain.DecisionType;
import com.SIH.ZeroFraud360.fraud.domain.FraudAlert;
import com.SIH.ZeroFraud360.fraud.domain.HoldRequest;
import com.SIH.ZeroFraud360.fraud.hold.client.BankSimulationHoldClient;
import com.SIH.ZeroFraud360.fraud.hold.dto.BankHoldRequestDto;
import com.SIH.ZeroFraud360.fraud.hold.dto.BankHoldResponseDto;
import com.SIH.ZeroFraud360.fraud.repository.FraudAlertRepository;
import com.SIH.ZeroFraud360.fraud.repository.HoldRequestRepository;
import com.SIH.ZeroFraud360.notification.service.NotificationBroadcastService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/internal/v1/fraud")
@CrossOrigin(origins = "*")
public class FraudPreCheckController {

    private static final Logger log = LoggerFactory.getLogger(FraudPreCheckController.class);

    private final ObservedTransactionRepository transactionRepository;
    private final FraudAlertRepository alertRepository;
    private final HoldRequestRepository holdRequestRepository;
    private final BankSimulationHoldClient holdClient;
    private final NotificationBroadcastService notificationService;

    public FraudPreCheckController(ObservedTransactionRepository transactionRepository,
                                  FraudAlertRepository alertRepository,
                                  HoldRequestRepository holdRequestRepository,
                                  BankSimulationHoldClient holdClient,
                                  NotificationBroadcastService notificationService) {
        this.transactionRepository = transactionRepository;
        this.alertRepository = alertRepository;
        this.holdRequestRepository = holdRequestRepository;
        this.holdClient = holdClient;
        this.notificationService = notificationService;
    }

    public record PreCheckRequest(
            String senderAccountId,
            String receiverAccountId,
            BigDecimal amount,
            String currency
    ) {}

    @PostMapping("/pre-check")
    @Transactional
    public ResponseEntity<Map<String, Object>> evaluatePreTransfer(@RequestBody PreCheckRequest request) {
        String sender = request.senderAccountId();
        String receiver = request.receiverAccountId();
        BigDecimal amount = request.amount() != null ? request.amount() : BigDecimal.ZERO;

        log.info("Pre-transfer fraud screening: sender={}, receiver={}, amount={}", sender, receiver, amount);

        Instant now = Instant.now();
        Instant windowStart = now.minus(Duration.ofSeconds(180));

        // 1. Hop 1 lookback: Find inflows into sender within last 180s
        List<ObservedTransaction> hop1Inflows = transactionRepository.findCandidateInflows(sender, windowStart, now);
        ObservedTransaction tHop1 = findMatchingTransaction(hop1Inflows, amount);

        if (tHop1 != null) {
            String prev1 = tHop1.getSenderAccountId();
            Instant hop1Time = tHop1.getOccurredAt();
            Instant window2Start = hop1Time.minus(Duration.ofSeconds(180));

            // 2. Hop 2 lookback: Find inflows into prev1
            List<ObservedTransaction> hop2Inflows = transactionRepository.findCandidateInflows(prev1, window2Start, hop1Time);
            ObservedTransaction tHop2 = findMatchingTransaction(hop2Inflows, tHop1.getAmount());

            if (tHop2 != null) {
                String prev2 = tHop2.getSenderAccountId();
                Instant hop2Time = tHop2.getOccurredAt();
                Instant window3Start = hop2Time.minus(Duration.ofSeconds(180));

                // 3. Hop 3 lookback: Find inflows into prev2 (e.g., A -> B)
                List<ObservedTransaction> hop3Inflows = transactionRepository.findCandidateInflows(prev2, window3Start, hop2Time);
                ObservedTransaction tHop3 = findMatchingTransaction(hop3Inflows, tHop2.getAmount());

                if (tHop3 != null) {
                    // Terminal 4th leg attempt detected! (A -> B -> C -> [sender D] -> [receiver E])
                    // 3 prior hops exist: tHop3 (A -> B), tHop2 (B -> C), tHop1 (C -> D).
                    // Intercept and enforce protective hold on sender D!
                    String rootVictim = tHop3.getSenderAccountId();
                    String intermediate1 = prev2; // e.g. B
                    String intermediate2 = prev1; // e.g. C

                    // Optional Hop 4 lookback: Check if tHop3 was fed by an even earlier victim
                    Instant hop3Time = tHop3.getOccurredAt();
                    Instant window4Start = hop3Time.minus(Duration.ofSeconds(180));
                    List<ObservedTransaction> hop4Inflows = transactionRepository.findCandidateInflows(rootVictim, window4Start, hop3Time);
                    ObservedTransaction tHop4 = findMatchingTransaction(hop4Inflows, tHop3.getAmount());
                    if (tHop4 != null) {
                        rootVictim = tHop4.getSenderAccountId();
                    }

                    log.warn("🚨 TERMINAL MULTI-HOP FRAUD INTERCEPTED IN PRE-CHECK: RootVictim={}, Chain: {} -> {} -> {} -> {} -> Attempted: {}",
                            rootVictim, rootVictim, intermediate1, intermediate2, sender, receiver);

                    String alertId = "ALT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
                    String dedupKey = alertId;
                    String holdRequestId = "HOLD-" + alertId;

                    long diffSeconds = Math.abs(Duration.between(tHop1.getOccurredAt(), now).getSeconds());

                    String interceptReason = String.format(
                            "Security Intercept: Suspicious multi-hop money mule chain detected! Stolen funds from Account %s were layered through mule accounts (%s, %s) to Account %s. Outflow to Account %s was BLOCKED and Account %s has been placed on protective hold pending confirmation.",
                            rootVictim, intermediate1, intermediate2, sender, receiver, sender
                    );

                    FraudAlert alert = new FraudAlert(
                            alertId,
                            dedupKey,
                            "MULTI_HOP_FRAUD_CHAIN",
                            AlertStatus.HOLD_ACTIVE,
                            tHop1.getTransactionId(),
                            "PENDING-" + UUID.randomUUID().toString().substring(0, 8),
                            rootVictim, // Account A (Victim)
                            intermediate2, // Intermediate mule (Account C)
                            sender, // HELD MULE ACCOUNT (Account D)
                            tHop1.getAmount(),
                            amount,
                            diffSeconds
                    );
                    alert.setDecision(DecisionType.STOP);
                    alert.setDecisionReason(interceptReason);
                    alert.setHoldRequestId(holdRequestId);
                    alert = alertRepository.save(alert);

                    // Place hold on sender (Account D) - NOT receiver (Account E)!
                    try {
                        BankHoldRequestDto holdDto = new BankHoldRequestDto(
                                holdRequestId,
                                alert.getSecondTransactionId(),
                                alertId,
                                amount,
                                "INR",
                                15,
                                "MULTI_HOP_MULE_INTERCEPT",
                                "ZERO_FRAUD_360"
                        );
                        BankHoldResponseDto holdRes = holdClient.placeHold(sender, holdDto);

                        HoldRequest hr = new HoldRequest(
                                holdRequestId,
                                alertId,
                                alert.getSecondTransactionId(),
                                sender,
                                amount,
                                "INR"
                        );
                        hr.setStatus("ACTIVE");
                        hr.setBankHoldId(holdRes != null ? holdRes.holdId() : holdRequestId);
                        hr.setCompletedAt(Instant.now());
                        holdRequestRepository.save(hr);

                        // Freeze sender (Account D) so D cannot send or receive
                        holdClient.freezeAccount(sender, "Protective hold on suspected money mule account " + sender + " in alert " + alertId);
                    } catch (Exception ex) {
                        log.error("Failed to enforce hold on sender account {} during pre-check: {}", sender, ex.getMessage());
                    }

                    // Broadcast alert to Officials and Victim Account A
                    try {
                        notificationService.broadcastFraudAlert(alert);
                    } catch (Exception nEx) {
                        log.error("Failed to broadcast notifications: {}", nEx.getMessage());
                    }

                    Map<String, Object> interceptResponse = new LinkedHashMap<>();
                    interceptResponse.put("allowed", false);
                    interceptResponse.put("action", "INTERCEPT_HOLD");
                    interceptResponse.put("heldAccount", sender);
                    interceptResponse.put("blockedTarget", receiver);
                    interceptResponse.put("alertId", alertId);
                    interceptResponse.put("reason", String.format("Security Intercept: Suspicious multi-hop transaction chain detected. Account %s has been placed on protective hold. Funds were NOT transferred to %s.", sender, receiver));

                    return ResponseEntity.ok(interceptResponse);
                } else {
                    log.info("Pre-check evaluated 2-hop pass-through for sender={} (C -> D leg). Allowed for surveillance.", sender);
                }
            }
        }

        // Clean transaction or surveillance pass-through
        return ResponseEntity.ok(Map.of("allowed", true));
    }

    private ObservedTransaction findMatchingTransaction(List<ObservedTransaction> candidates, BigDecimal targetAmount) {
        if (candidates == null || candidates.isEmpty()) return null;
        for (ObservedTransaction tx : candidates) {
            if (!"SUCCESS".equalsIgnoreCase(tx.getStatus())) continue;
            boolean exactAmount = tx.getAmount().compareTo(targetAmount) == 0;
            boolean ratioMatch = tx.getAmount().compareTo(BigDecimal.ZERO) > 0 &&
                    targetAmount.doubleValue() >= (tx.getAmount().doubleValue() * 0.60) &&
                    targetAmount.doubleValue() <= (tx.getAmount().doubleValue() * 1.05);
            if (exactAmount || ratioMatch) {
                return tx;
            }
        }
        return null;
    }
}
