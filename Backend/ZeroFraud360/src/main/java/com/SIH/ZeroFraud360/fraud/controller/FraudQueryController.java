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
import com.SIH.ZeroFraud360.fraud.dto.AccountForensicsDto;
import com.SIH.ZeroFraud360.fraud.dto.DashboardMetricsDto;
import com.SIH.ZeroFraud360.fraud.dto.QuickAccountDto;
import com.SIH.ZeroFraud360.fraud.service.AccountForensicsService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/fraud")
public class FraudQueryController {

    private final FraudAlertRepository alertRepository;
    private final ObservedTransactionRepository transactionRepository;
    private final FraudPatternRepository patternRepository;
    private final AccountForensicsService forensicsService;
    private final com.SIH.ZeroFraud360.fraud.hold.service.HoldCoordinator holdCoordinator;

    public FraudQueryController(FraudAlertRepository alertRepository,
                                ObservedTransactionRepository transactionRepository,
                                FraudPatternRepository patternRepository,
                                AccountForensicsService forensicsService,
                                com.SIH.ZeroFraud360.fraud.hold.service.HoldCoordinator holdCoordinator) {
        this.alertRepository = alertRepository;
        this.transactionRepository = transactionRepository;
        this.patternRepository = patternRepository;
        this.forensicsService = forensicsService;
        this.holdCoordinator = holdCoordinator;
    }

    @GetMapping("/accounts/quick-list")
    public ResponseEntity<List<QuickAccountDto>> getQuickAccounts() {
        return ResponseEntity.ok(forensicsService.getQuickAccounts());
    }

    @GetMapping("/accounts/{accountId}/forensics")
    public ResponseEntity<AccountForensicsDto> getAccountForensics(@PathVariable("accountId") String accountId) {
        return ResponseEntity.ok(forensicsService.getAccountForensics(accountId));
    }

    @GetMapping("/metrics/dashboard")
    public ResponseEntity<DashboardMetricsDto> getDashboardMetrics() {
        List<ObservedTransaction> txs = transactionRepository.findAll();
        List<FraudAlert> alerts = alertRepository.findAll();

        long totalTransactions = txs.size();
        BigDecimal totalAmount = txs.stream()
                .map(ObservedTransaction::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long flaggedAlerts = alerts.size();
        long activeHolds = alerts.stream()
                .filter(a -> a.getStatus() == com.SIH.ZeroFraud360.fraud.domain.AlertStatus.HOLD_ACTIVE)
                .count();

        java.util.Set<String> affectedAccounts = new java.util.HashSet<>();
        alerts.forEach(a -> {
            if (a.getSourceAccountId() != null) affectedAccounts.add(a.getSourceAccountId());
            if (a.getIntermediateAccountId() != null) affectedAccounts.add(a.getIntermediateAccountId());
            if (a.getDestinationAccountId() != null) affectedAccounts.add(a.getDestinationAccountId());
        });

        java.util.Set<String> anomalyTxIds = new java.util.HashSet<>();
        alerts.forEach(a -> {
            if (a.getSecondTransactionId() != null) anomalyTxIds.add(a.getSecondTransactionId());
        });

        long suspiciousTx = txs.stream()
                .filter(t -> t.getTransactionId() != null && anomalyTxIds.contains(t.getTransactionId()))
                .count();
        if (suspiciousTx == 0 && !alerts.isEmpty() && totalTransactions > 0) {
            suspiciousTx = Math.min(totalTransactions, alerts.size());
        }
        long normalTx = Math.max(0, totalTransactions - suspiciousTx);

        double normalPct = totalTransactions > 0 ? Math.round(((double) normalTx / totalTransactions) * 100.0) : 0.0;
        double suspiciousPct = totalTransactions > 0 ? (100.0 - normalPct) : 0.0;

        String[] labels = {"00-04h", "04-08h", "08-12h", "12-16h", "16-20h", "20-24h"};
        long[] normalCounts = new long[6];
        long[] alertCounts = new long[6];
        BigDecimal[] binAmounts = new BigDecimal[6];
        for (int i = 0; i < 6; i++) {
            binAmounts[i] = BigDecimal.ZERO;
        }

        ZoneId zone = ZoneId.of("Asia/Kolkata");
        for (ObservedTransaction tx : txs) {
            Instant inst = tx.getOccurredAt() != null ? tx.getOccurredAt() : tx.getCreatedAt();
            if (inst != null) {
                int hour = inst.atZone(zone).getHour();
                int idx = Math.min(5, Math.max(0, hour / 4));
                if (anomalyTxIds.contains(tx.getTransactionId())) {
                    alertCounts[idx]++;
                } else {
                    normalCounts[idx]++;
                }
                if (tx.getAmount() != null) {
                    binAmounts[idx] = binAmounts[idx].add(tx.getAmount());
                }
            }
        }

        // Also account for any alerts whose triggering transactions might be tracked outside txs list
        java.util.Set<String> countedTxIds = new java.util.HashSet<>();
        txs.forEach(t -> countedTxIds.add(t.getTransactionId()));
        for (FraudAlert a : alerts) {
            String txId = a.getSecondTransactionId() != null ? a.getSecondTransactionId() : a.getFirstTransactionId();
            if (txId == null || !countedTxIds.contains(txId)) {
                Instant inst = a.getCreatedAt();
                if (inst != null) {
                    int hour = inst.atZone(zone).getHour();
                    int idx = Math.min(5, Math.max(0, hour / 4));
                    alertCounts[idx]++;
                }
            }
        }

        List<DashboardMetricsDto.HourlyBinDto> timeBins = new java.util.ArrayList<>();
        for (int i = 0; i < 6; i++) {
            timeBins.add(new DashboardMetricsDto.HourlyBinDto(labels[i], normalCounts[i], alertCounts[i], binAmounts[i]));
        }

        return ResponseEntity.ok(new DashboardMetricsDto(
                totalTransactions,
                totalAmount,
                flaggedAlerts,
                activeHolds,
                affectedAccounts.size(),
                normalTx,
                suspiciousTx,
                normalPct,
                suspiciousPct,
                timeBins
        ));
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
    public ResponseEntity<Map<String, String>> deletePattern(
            @PathVariable("patternId") String patternId,
            @RequestParam(name = "permanent", defaultValue = "false") boolean permanent) {
        patternRepository.findByPatternId(patternId).ifPresent(p -> {
            if (permanent || "ARCHIVED".equalsIgnoreCase(p.getStatus())) {
                patternRepository.delete(p);
            } else {
                p.setStatus("ARCHIVED");
                patternRepository.save(p);
            }
        });
        return ResponseEntity.ok(Map.of("patternId", patternId, "status", permanent ? "DELETED" : "ARCHIVED"));
    }

    @DeleteMapping("/patterns/custom/purge")
    public ResponseEntity<Map<String, Object>> purgeCustomPatterns() {
        List<FraudPattern> customPatterns = patternRepository.findAll().stream()
                .filter(p -> !p.getPatternId().startsWith("PAT-BASELINE-"))
                .toList();
        patternRepository.deleteAll(customPatterns);
        return ResponseEntity.ok(Map.of("success", true, "purgedCount", customPatterns.size()));
    }

    @GetMapping("/alerts/victim/{accountId}")
    public ResponseEntity<List<FraudAlert>> getVictimAlerts(@PathVariable("accountId") String accountId) {
        List<FraudAlert> alerts = alertRepository.findBySourceAccountIdOrderByCreatedAtDesc(accountId).stream()
                .filter(a -> a.getStatus() == com.SIH.ZeroFraud360.fraud.domain.AlertStatus.HOLD_ACTIVE)
                .toList();
        return ResponseEntity.ok(alerts);
    }

    @PostMapping("/alerts/{alertId}/confirm-victim")
    public ResponseEntity<Map<String, Object>> confirmFraudAsVictim(@PathVariable("alertId") String alertId) {
        holdCoordinator.confirmFraud(alertId, "VICTIM_VERIFIED", "Victim confirmed unauthorized fraud transfer");
        return ResponseEntity.ok(Map.of("alertId", alertId, "status", "CONFIRMED_FRAUD", "confirmedBy", "VICTIM"));
    }

    @PostMapping("/alerts/{alertId}/release-victim")
    public ResponseEntity<Map<String, Object>> releaseHoldAsVictim(@PathVariable("alertId") String alertId) {
        holdCoordinator.releaseHold(alertId, "VICTIM_AUTHORIZED", "Victim reported that this transaction was authorized");
        return ResponseEntity.ok(Map.of("alertId", alertId, "status", "RELEASED", "releasedBy", "VICTIM"));
    }
}
