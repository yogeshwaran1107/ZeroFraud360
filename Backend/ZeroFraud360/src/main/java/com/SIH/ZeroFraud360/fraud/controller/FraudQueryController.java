package com.SIH.ZeroFraud360.fraud.controller;

import com.SIH.ZeroFraud360.common.exception.ResourceNotFoundException;
import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import com.SIH.ZeroFraud360.event.repository.ObservedTransactionRepository;
import com.SIH.ZeroFraud360.fraud.domain.FraudAlert;
import com.SIH.ZeroFraud360.fraud.repository.FraudAlertRepository;
import com.SIH.ZeroFraud360.fraud.domain.FraudPattern;
import com.SIH.ZeroFraud360.fraud.dto.FraudPatternDto;
import com.SIH.ZeroFraud360.fraud.repository.FraudPatternRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/fraud")
public class FraudQueryController {

    private final FraudAlertRepository alertRepository;
    private final ObservedTransactionRepository transactionRepository;
    private final FraudPatternRepository patternRepository;

    public FraudQueryController(FraudAlertRepository alertRepository,
                                ObservedTransactionRepository transactionRepository,
                                FraudPatternRepository patternRepository) {
        this.alertRepository = alertRepository;
        this.transactionRepository = transactionRepository;
        this.patternRepository = patternRepository;
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<FraudAlert>> getAllAlerts() {
        return ResponseEntity.ok(alertRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/alerts/{alertId}")
    public ResponseEntity<FraudAlert> getAlertById(@PathVariable("alertId") String alertId) {
        FraudAlert alert = alertRepository.findByAlertId(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("FraudAlert", alertId));
        return ResponseEntity.ok(alert);
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<ObservedTransaction>> getAllObservedTransactions() {
        return ResponseEntity.ok(transactionRepository.findAll());
    }

    @GetMapping("/patterns")
    public ResponseEntity<List<FraudPatternDto>> getAllPatterns() {
        List<FraudPatternDto> list = patternRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(FraudPatternDto::fromEntity)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/patterns")
    public ResponseEntity<FraudPatternDto> createPattern(@RequestBody Map<String, Object> body) {
        String patternId = (String) body.getOrDefault("patternId", "PAT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        String patternName = (String) body.getOrDefault("patternName", "Custom Detection Signature");
        String patternType = (String) body.getOrDefault("patternType", "RAPID_PASS_THROUGH");
        String description = (String) body.getOrDefault("description", "Custom pattern stored by officer");
        String riskLevel = (String) body.getOrDefault("riskLevel", "HIGH");
        String sourceAccount = (String) body.get("sourceAccount");
        String muleAccount = (String) body.get("muleAccount");
        String destinationAccount = (String) body.get("destinationAccount");
        String officerId = (String) body.getOrDefault("confirmedByOfficer", "OFFICER");
        String alertId = (String) body.get("alertId");

        java.math.BigDecimal minAmount = body.get("minAmount") != null ? new java.math.BigDecimal(body.get("minAmount").toString()) : null;
        java.math.BigDecimal maxAmount = body.get("maxAmount") != null ? new java.math.BigDecimal(body.get("maxAmount").toString()) : null;
        Integer timeWindow = body.get("timeWindowSeconds") != null ? Integer.valueOf(body.get("timeWindowSeconds").toString()) : 180;

        FraudPattern pattern = new FraudPattern(
                patternId,
                patternName,
                patternType,
                description,
                riskLevel,
                sourceAccount,
                muleAccount,
                destinationAccount,
                minAmount,
                maxAmount,
                timeWindow,
                "CONFIRMED_FRAUD_BLOCK",
                officerId,
                alertId
        );

        FraudPattern saved = patternRepository.save(pattern);
        return ResponseEntity.ok(FraudPatternDto.fromEntity(saved));
    }

    @DeleteMapping("/patterns/{patternId}")
    public ResponseEntity<Map<String, String>> deletePattern(@PathVariable("patternId") String patternId) {
        patternRepository.findByPatternId(patternId).ifPresent(p -> {
            p.setStatus("ARCHIVED");
            patternRepository.save(p);
        });
        return ResponseEntity.ok(Map.of("patternId", patternId, "status", "ARCHIVED"));
    }
}
