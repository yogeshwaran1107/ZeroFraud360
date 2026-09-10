package com.SIH.ZeroFraud360.fraud.service;

import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import com.SIH.ZeroFraud360.fraud.decision.client.DecisionApiClient;
import com.SIH.ZeroFraud360.fraud.decision.dto.DecisionApiRequestDto;
import com.SIH.ZeroFraud360.fraud.decision.dto.DecisionApiResponseDto;
import com.SIH.ZeroFraud360.fraud.decision.dto.DecisionApiTransactionDto;
import com.SIH.ZeroFraud360.fraud.domain.AlertStatus;
import com.SIH.ZeroFraud360.fraud.domain.DecisionType;
import com.SIH.ZeroFraud360.fraud.domain.FraudAlert;
import com.SIH.ZeroFraud360.fraud.hold.service.HoldCoordinator;
import com.SIH.ZeroFraud360.fraud.repository.FraudAlertRepository;
import com.SIH.ZeroFraud360.fraud.rule.FraudFinding;
import com.SIH.ZeroFraud360.notification.service.NotificationBroadcastService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class FraudAlertService {

    private static final Logger log = LoggerFactory.getLogger(FraudAlertService.class);

    private final FraudAlertRepository alertRepository;
    private final DecisionApiClient decisionApiClient;
    private final HoldCoordinator holdCoordinator;
    private final NotificationBroadcastService notificationService;

    public FraudAlertService(FraudAlertRepository alertRepository,
                             DecisionApiClient decisionApiClient,
                             HoldCoordinator holdCoordinator,
                             NotificationBroadcastService notificationService) {
        this.alertRepository = alertRepository;
        this.decisionApiClient = decisionApiClient;
        this.holdCoordinator = holdCoordinator;
        this.notificationService = notificationService;
    }

    @Transactional
    public FraudAlert createAlertAndEvaluate(FraudFinding finding, ObservedTransaction t1, ObservedTransaction t2) {
        String dedupKey = String.format("RAPID_PASS_THROUGH:%s:%s", finding.firstTransactionId(), finding.secondTransactionId());

        Optional<FraudAlert> existing = alertRepository.findByDedupKey(dedupKey);
        if (existing.isPresent()) {
            log.info("Alert already exists for dedupKey={}, returning existing alert", dedupKey);
            return existing.get();
        }

        String alertId = "ALERT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();

        FraudAlert alert = new FraudAlert(
                alertId,
                dedupKey,
                finding.ruleName(),
                AlertStatus.WAITING_DECISION,
                finding.firstTransactionId(),
                finding.secondTransactionId(),
                finding.sourceAccountId(),
                finding.intermediateAccountId(),
                finding.destinationAccountId(),
                finding.firstAmount(),
                finding.secondAmount(),
                finding.timeDifferenceSeconds()
        );
        alert = alertRepository.save(alert);
        log.warn("Created fraud alert: alertId={}, dedupKey={}, message={}", alertId, dedupKey, finding.message());

        // Prepare external decision request
        String decRequestId = "DEC-" + alertId;
        DecisionApiRequestDto decRequest = new DecisionApiRequestDto(
                decRequestId,
                alertId,
                finding.ruleName(),
                new DecisionApiTransactionDto(
                        t1.getTransactionId(),
                        t1.getSenderAccountId(),
                        t1.getReceiverAccountId(),
                        t1.getAmount(),
                        t1.getCurrency(),
                        t1.getOccurredAt()
                ),
                new DecisionApiTransactionDto(
                        t2.getTransactionId(),
                        t2.getSenderAccountId(),
                        t2.getReceiverAccountId(),
                        t2.getAmount(),
                        t2.getCurrency(),
                        t2.getOccurredAt()
                ),
                finding.timeDifferenceSeconds(),
                finding.message()
        );

        try {
            DecisionApiResponseDto decResponse = decisionApiClient.requestDecision(decRequest);
            if (DecisionType.STOP.name().equalsIgnoreCase(decResponse.decision())) {
                alert.setDecision(DecisionType.STOP);
                alert.setDecisionReason(decResponse.reason());
                alert.setStatus(AlertStatus.STOP_RECEIVED);
                alert.setExternalDecisionRequestId(decRequestId);
                alertRepository.save(alert);

                // Command IndianBankSimulation to place hold on destination account
                holdCoordinator.executeStopHold(alert);

                // Broadcast urgent notification to Police, Cyber Crime, Bank, and Victim
                try {
                    notificationService.broadcastFraudAlert(alert);
                } catch (Exception nEx) {
                    log.error("Failed to broadcast notifications for alert {}: {}", alertId, nEx.getMessage());
                }
            } else {
                alert.setDecision(DecisionType.ALLOW);
                alert.setDecisionReason(decResponse.reason());
                alert.setStatus(AlertStatus.RESOLVED);
                alert.setResolvedAt(Instant.now());
                alert.setExternalDecisionRequestId(decRequestId);
                alertRepository.save(alert);
                log.info("Fraud alert {} resolved with ALLOW decision", alertId);
            }
        } catch (Exception ex) {
            log.error("Decision evaluation failed for alert {}: {}", alertId, ex.getMessage());
            alert.setStatus(AlertStatus.ERROR);
            alert.setDecisionReason("Decision API failure: " + ex.getMessage());
            alertRepository.save(alert);
        }

        return alert;
    }
}
