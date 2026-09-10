package com.SIH.ZeroFraud360.fraud.controller;

import com.SIH.ZeroFraud360.common.exception.ResourceNotFoundException;
import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import com.SIH.ZeroFraud360.event.repository.ObservedTransactionRepository;
import com.SIH.ZeroFraud360.fraud.domain.FraudAlert;
import com.SIH.ZeroFraud360.fraud.repository.FraudAlertRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/fraud")
public class FraudQueryController {

    private final FraudAlertRepository alertRepository;
    private final ObservedTransactionRepository transactionRepository;

    public FraudQueryController(FraudAlertRepository alertRepository, ObservedTransactionRepository transactionRepository) {
        this.alertRepository = alertRepository;
        this.transactionRepository = transactionRepository;
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
}
