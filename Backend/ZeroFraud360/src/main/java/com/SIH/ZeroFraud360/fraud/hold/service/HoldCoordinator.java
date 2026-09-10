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

    public HoldCoordinator(BankSimulationHoldClient holdClient,
                           HoldRequestRepository holdRequestRepository,
                           FraudAlertRepository alertRepository) {
        this.holdClient = holdClient;
        this.holdRequestRepository = holdRequestRepository;
        this.alertRepository = alertRepository;
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
        holdClient.releaseHold(effectiveBankHoldId, new BankReleaseHoldRequestDto(officerId, reason));

        if (holdRequest != null) {
            holdRequest.setStatus("RELEASED");
            holdRequest.setCompletedAt(Instant.now());
            holdRequestRepository.save(holdRequest);

            alertRepository.findByAlertId(holdRequest.getAlertId()).ifPresent(alert -> {
                alert.setStatus(AlertStatus.RESOLVED);
                alert.setResolvedAt(Instant.now());
                alertRepository.save(alert);
            });
        }
    }
}
