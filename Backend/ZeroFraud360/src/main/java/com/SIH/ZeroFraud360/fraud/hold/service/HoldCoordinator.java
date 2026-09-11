package com.SIH.ZeroFraud360.fraud.hold.service;

import com.SIH.ZeroFraud360.fraud.domain.AlertStatus;
import com.SIH.ZeroFraud360.fraud.domain.DecisionType;
import com.SIH.ZeroFraud360.fraud.domain.FraudAlert;
import com.SIH.ZeroFraud360.fraud.domain.HoldRequest;
import com.SIH.ZeroFraud360.fraud.hold.client.BankSimulationHoldClient;
import com.SIH.ZeroFraud360.fraud.hold.dto.BankHoldRequestDto;
import com.SIH.ZeroFraud360.fraud.hold.dto.BankHoldResponseDto;
import com.SIH.ZeroFraud360.fraud.hold.dto.BankReleaseHoldRequestDto;
import com.SIH.ZeroFraud360.fraud.repository.FraudAlertRepository;
import com.SIH.ZeroFraud360.fraud.repository.HoldRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class HoldCoordinator {

    private static final Logger log = LoggerFactory.getLogger(HoldCoordinator.class);

    private final BankSimulationHoldClient holdClient;
    private final HoldRequestRepository holdRequestRepository;
    private final FraudAlertRepository alertRepository;
    private final com.SIH.ZeroFraud360.fraud.repository.FraudPatternRepository patternRepository;

    public HoldCoordinator(BankSimulationHoldClient holdClient,
                           HoldRequestRepository holdRequestRepository,
                           FraudAlertRepository alertRepository,
                           com.SIH.ZeroFraud360.fraud.repository.FraudPatternRepository patternRepository) {
        this.holdClient = holdClient;
        this.holdRequestRepository = holdRequestRepository;
        this.alertRepository = alertRepository;
        this.patternRepository = patternRepository;
    }

    @Transactional
    public void executeStopHold(FraudAlert alert) {
        String holdRequestId = "HOLD-" + alert.getAlertId();
        alert.setStatus(AlertStatus.HOLD_REQUESTED);
        alert.setHoldRequestId(holdRequestId);
        alertRepository.save(alert);

        HoldRequest holdRequest = holdRequestRepository.findByRequestId(holdRequestId)
                .orElseGet(() -> new HoldRequest(
                        holdRequestId,
                        alert.getAlertId(),
                        alert.getSecondTransactionId(),
                        alert.getDestinationAccountId(),
                        alert.getSecondAmount(),
                        "INR"
                ));

        try {
            BankHoldRequestDto dto = new BankHoldRequestDto(
                    holdRequestId,
                    alert.getSecondTransactionId(),
                    alert.getAlertId(),
                    alert.getSecondAmount(),
                    "INR",
                    10,
                    "FRAUD_ALERT",
                    "ZERO_FRAUD_360"
            );

            BankHoldResponseDto response = holdClient.placeHold(alert.getDestinationAccountId(), dto);

            // Also explicitly freeze destination account and intermediate mule account in IndianBankSimulation
            holdClient.freezeAccount(alert.getDestinationAccountId(), "Destination account in fraud alert " + alert.getAlertId());
            if (alert.getIntermediateAccountId() != null && !alert.getIntermediateAccountId().isBlank()
                    && !alert.getIntermediateAccountId().equals(alert.getDestinationAccountId())) {
                holdClient.freezeAccount(alert.getIntermediateAccountId(), "Suspected mule in fraud alert " + alert.getAlertId());
            }

            holdRequest.setStatus("ACTIVE");
            holdRequest.setBankHoldId(response.holdId());
            holdRequest.setCompletedAt(Instant.now());
            holdRequestRepository.save(holdRequest);

            alert.setStatus(AlertStatus.HOLD_ACTIVE);
            alertRepository.save(alert);

            log.info("Successfully enforced STOP hold on BankSimulation: alertId={}, bankHoldId={}, account={}",
                    alert.getAlertId(), response.holdId(), alert.getDestinationAccountId());
        } catch (Exception ex) {
            log.error("Failed to enforce hold on BankSimulation for alertId={}: {}", alert.getAlertId(), ex.getMessage());
            holdRequest.setStatus("FAILED");
            holdRequest.setLastError(ex.getMessage());
            holdRequestRepository.save(holdRequest);

            alert.setStatus(AlertStatus.ERROR);
            alertRepository.save(alert);
            throw ex;
        }
    }

    @Transactional
    public void releaseHold(String holdId, String officerId, String reason) {
        HoldRequest holdRequest = holdRequestRepository.findByRequestId(holdId)
                .or(() -> holdRequestRepository.findByAlertId(holdId))
                .orElse(null);

        String effectiveBankHoldId = holdRequest != null && holdRequest.getBankHoldId() != null
                ? holdRequest.getBankHoldId()
                : holdId;

        log.info("Releasing hold: holdId={}, bankHoldId={}, officer={}", holdId, effectiveBankHoldId, officerId);
        try {
            holdClient.releaseHold(effectiveBankHoldId, new BankReleaseHoldRequestDto(officerId, reason));
        } catch (Exception ex) {
            log.warn("Bank simulation release returned: {} (proceeding with ZeroFraud360 clearance)", ex.getMessage());
        }

        FraudAlert alertToUnfreeze = null;
        if (holdRequest != null) {
            holdRequest.setStatus("RELEASED");
            holdRequest.setCompletedAt(Instant.now());
            holdRequestRepository.save(holdRequest);

            var aOpt = alertRepository.findByAlertId(holdRequest.getAlertId());
            if (aOpt.isPresent()) {
                alertToUnfreeze = aOpt.get();
                alertToUnfreeze.setStatus(AlertStatus.RESOLVED);
                alertToUnfreeze.setDecisionReason("Cleared by officer (" + officerId + "): " + reason + " [False Positive]");
                alertToUnfreeze.setResolvedAt(Instant.now());
                alertRepository.save(alertToUnfreeze);
            }
        } else {
            var aOpt = alertRepository.findByAlertId(holdId);
            if (aOpt.isPresent()) {
                alertToUnfreeze = aOpt.get();
                alertToUnfreeze.setStatus(AlertStatus.RESOLVED);
                alertToUnfreeze.setDecisionReason("Cleared by officer (" + officerId + "): " + reason + " [False Positive]");
                alertToUnfreeze.setResolvedAt(Instant.now());
                alertRepository.save(alertToUnfreeze);
            }
        }

        // Unfreeze all associated accounts on IndianBankSimulation
        if (alertToUnfreeze != null) {
            if (alertToUnfreeze.getDestinationAccountId() != null) {
                holdClient.unfreezeAccount(alertToUnfreeze.getDestinationAccountId(), reason);
            }
            if (alertToUnfreeze.getIntermediateAccountId() != null) {
                holdClient.unfreezeAccount(alertToUnfreeze.getIntermediateAccountId(), reason);
            }
            log.info("Unfrozen accounts for alertId {}: destination={}, intermediate={}",
                    alertToUnfreeze.getAlertId(), alertToUnfreeze.getDestinationAccountId(), alertToUnfreeze.getIntermediateAccountId());
        }
    }

    @Transactional
    public void confirmFraud(String holdId, String officerId, String reason) {
        HoldRequest holdRequest = holdRequestRepository.findByRequestId(holdId)
                .or(() -> holdRequestRepository.findByAlertId(holdId))
                .orElse(null);

        String effectiveBankHoldId = holdRequest != null && holdRequest.getBankHoldId() != null
                ? holdRequest.getBankHoldId()
                : holdId;

        log.warn("OFFICIALLY CONFIRMING FRAUD & BLOCKING FUNDS: holdId={}, bankHoldId={}, officer={}", holdId, effectiveBankHoldId, officerId);
        try {
            holdClient.blockHold(effectiveBankHoldId, new BankReleaseHoldRequestDto(officerId, reason));
        } catch (Exception ex) {
            log.warn("Bank simulation block returned: {} (proceeding with ZeroFraud360 pattern storage)", ex.getMessage());
        }

        FraudAlert alertObj = null;
        if (holdRequest != null) {
            holdRequest.setStatus("BLOCKED");
            holdRequest.setCompletedAt(Instant.now());
            holdRequestRepository.save(holdRequest);

            var alertOpt = alertRepository.findByAlertId(holdRequest.getAlertId());
            if (alertOpt.isPresent()) {
                alertObj = alertOpt.get();
                alertObj.setStatus(AlertStatus.CONFIRMED_FRAUD);
                alertObj.setDecisionReason("Confirmed fraud by officer (" + officerId + "): " + reason + " [Funds Blocked]");
                alertObj.setResolvedAt(Instant.now());
                alertRepository.save(alertObj);
            }
        } else {
            var alertOpt = alertRepository.findByAlertId(holdId);
            if (alertOpt.isPresent()) {
                alertObj = alertOpt.get();
                alertObj.setStatus(AlertStatus.CONFIRMED_FRAUD);
                alertObj.setDecisionReason("Confirmed fraud by officer (" + officerId + "): " + reason + " [Funds Blocked]");
                alertObj.setResolvedAt(Instant.now());
                alertRepository.save(alertObj);
            }
        }

        // Store detected pattern in Fraud Patterns Registry
        if (alertObj != null) {
            String patternId = "PAT-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
            String patternName = String.format("Mule Network: %s -> %s (₹%s)",
                    alertObj.getSourceAccountId() != null ? alertObj.getSourceAccountId() : "UNKNOWN",
                    alertObj.getDestinationAccountId() != null ? alertObj.getDestinationAccountId() : "UNKNOWN",
                    alertObj.getSecondAmount() != null ? alertObj.getSecondAmount().stripTrailingZeros().toPlainString() : "0");

            com.SIH.ZeroFraud360.fraud.domain.FraudPattern pattern = new com.SIH.ZeroFraud360.fraud.domain.FraudPattern(
                    patternId,
                    patternName,
                    alertObj.getPatternType() != null ? alertObj.getPatternType() : "RAPID_PASS_THROUGH",
                    reason,
                    "CRITICAL",
                    alertObj.getSourceAccountId(),
                    alertObj.getIntermediateAccountId(),
                    alertObj.getDestinationAccountId(),
                    alertObj.getFirstAmount(),
                    alertObj.getSecondAmount(),
                    alertObj.getTimeDifferenceSeconds() != null ? alertObj.getTimeDifferenceSeconds().intValue() : 180,
                    "CONFIRMED_FRAUD_BLOCK",
                    officerId,
                    alertObj.getAlertId()
            );
            patternRepository.save(pattern);
            log.info("Stored confirmed fraud pattern in registry: patternId={}, name='{}'", patternId, patternName);
        }
    }
}
