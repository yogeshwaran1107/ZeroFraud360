package com.SIH.ZeroFraud360.fraud.controller;

import com.SIH.ZeroFraud360.event.repository.ObservedTransactionRepository;
import com.SIH.ZeroFraud360.event.repository.ProcessedEventRepository;
import com.SIH.ZeroFraud360.fraud.domain.AlertStatus;
import com.SIH.ZeroFraud360.fraud.repository.DecisionRequestRepository;
import com.SIH.ZeroFraud360.fraud.repository.FraudAlertRepository;
import com.SIH.ZeroFraud360.fraud.repository.FraudPatternRepository;
import com.SIH.ZeroFraud360.fraud.repository.HoldRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/developer")
@CrossOrigin(origins = "*")
public class DeveloperController {

    private static final Logger log = LoggerFactory.getLogger(DeveloperController.class);

    private final FraudAlertRepository alertRepository;
    private final ObservedTransactionRepository transactionRepository;
    private final HoldRequestRepository holdRequestRepository;
    private final DecisionRequestRepository decisionRequestRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final FraudPatternRepository patternRepository;
    private final RestTemplate restTemplate;

    @Value("${bank.sim.base-url:http://localhost:8080}")
    private String bankSimBaseUrl;

    public DeveloperController(FraudAlertRepository alertRepository,
                               ObservedTransactionRepository transactionRepository,
                               HoldRequestRepository holdRequestRepository,
                               DecisionRequestRepository decisionRequestRepository,
                               ProcessedEventRepository processedEventRepository,
                               FraudPatternRepository patternRepository) {
        this.alertRepository = alertRepository;
        this.transactionRepository = transactionRepository;
        this.holdRequestRepository = holdRequestRepository;
        this.decisionRequestRepository = decisionRequestRepository;
        this.processedEventRepository = processedEventRepository;
        this.patternRepository = patternRepository;
        this.restTemplate = new RestTemplate();
    }

    @PostMapping("/reset-all")
    @Transactional
    public ResponseEntity<Map<String, Object>> resetAllSystems() {
        log.warn("DEVELOPER ACTION: Full reset of ZeroFraud360 and IndianBankSimulation");

        // 1. Wipe ZeroFraud360 data
        wipeZeroFraudData();

        // 2. Wipe IndianBankSimulation data via its developer endpoint
        String bankResultMsg = "Bank reset attempted";
        try {
            String bankResetUrl = bankSimBaseUrl + "/api/developer/reset";
            Map<?, ?> bankRes = restTemplate.postForObject(bankResetUrl, null, Map.class);
            if (bankRes != null && bankRes.get("message") != null) {
                bankResultMsg = bankRes.get("message").toString();
            }
        } catch (Exception ex) {
            log.warn("Failed to notify IndianBankSimulation reset endpoint: {}", ex.getMessage());
            bankResultMsg = "Could not reach Bank Simulation (:8080): " + ex.getMessage();
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "All systems reset to clean state. Alerts and transactions cleared, bank accounts active with starting balances.");
        response.put("bankSimulationResult", bankResultMsg);
        response.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-zerofraud")
    @Transactional
    public ResponseEntity<Map<String, Object>> resetZeroFraudOnly() {
        log.warn("DEVELOPER ACTION: Resetting ZeroFraud360 records only");
        wipeZeroFraudData();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "ZeroFraud360 database wiped clean (0 transactions, 0 alerts, 0 holds).");
        response.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/unfreeze-all")
    public ResponseEntity<Map<String, Object>> unfreezeAll() {
        log.info("DEVELOPER ACTION: Calling IndianBankSimulation to unfreeze all accounts");
        String bankMsg = "Done";
        try {
            String bankUrl = bankSimBaseUrl + "/api/developer/unfreeze-all";
            Map<?, ?> res = restTemplate.postForObject(bankUrl, null, Map.class);
            if (res != null && res.get("message") != null) {
                bankMsg = res.get("message").toString();
            }
        } catch (Exception ex) {
            log.warn("Failed to reach Bank Simulation unfreeze: {}", ex.getMessage());
            bankMsg = "Error: " + ex.getMessage();
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", bankMsg);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getSystemStatus() {
        long txCount = transactionRepository.count();
        long alertCount = alertRepository.count();
        long mediumRiskCount = alertRepository.findAll().stream()
                .filter(a -> a.getStatus() == AlertStatus.MEDIUM_RISK)
                .count();
        long criticalCount = alertRepository.findAll().stream()
                .filter(a -> a.getStatus() == AlertStatus.HOLD_ACTIVE || a.getStatus() == AlertStatus.STOP_RECEIVED)
                .count();
        long holdCount = holdRequestRepository.count();
        long patternsCount = patternRepository.count();

        boolean bankConnected = false;
        try {
            ResponseEntity<String> res = restTemplate.getForEntity(bankSimBaseUrl + "/actuator/health", String.class);
            bankConnected = res.getStatusCode().is2xxSuccessful();
        } catch (Exception ignored) {
            // bank may be offline
        }

        Map<String, Object> status = new LinkedHashMap<>();
        status.put("observedTransactionsCount", txCount);
        status.put("fraudAlertsCount", alertCount);
        status.put("mediumRiskAlertsCount", mediumRiskCount);
        status.put("criticalAlertsCount", criticalCount);
        status.put("holdRequestsCount", holdCount);
        status.put("fraudPatternsCount", patternsCount);
        status.put("bankSimulationConnected", bankConnected);
        status.put("zeroFraudConnected", true);
        status.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(status);
    }

    private void wipeZeroFraudData() {
        holdRequestRepository.deleteAll();
        decisionRequestRepository.deleteAll();
        alertRepository.deleteAll();
        transactionRepository.deleteAll();
        processedEventRepository.deleteAll();
    }
}