package com.SIH.IndianBankSimulation.payment.controller;

import com.SIH.IndianBankSimulation.payment.dto.PaymentTransferResponse;
import com.SIH.IndianBankSimulation.payment.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class TheftController {

    private static final Logger log = LoggerFactory.getLogger(TheftController.class);

    private final PaymentService paymentService;
    private final RestTemplate restTemplate;

    @Value("${bank.zerofraud360.base-url:http://localhost:8081}")
    private String zeroFraudBaseUrl = "http://localhost:8081";

    public TheftController(PaymentService paymentService) {
        this.paymentService = paymentService;
        this.restTemplate = new RestTemplate();
    }

    public record SimulateTheftRequest(
            String victimAccountNumber,
            String recipientAccountNumber,
            BigDecimal amount,
            String remarks
    ) {}

    @PostMapping("/simulate-theft")
    public ResponseEntity<PaymentTransferResponse> simulateTheft(@RequestBody SimulateTheftRequest request) {
        log.warn("SIMULATING THEFT DRAIN: Victim={} -> Recipient={}, Amount={}",
                request.victimAccountNumber(), request.recipientAccountNumber(), request.amount());

        BigDecimal amount = request.amount() != null && request.amount().compareTo(BigDecimal.ZERO) > 0
                ? request.amount()
                : new BigDecimal("50000.00");

        PaymentTransferResponse response = paymentService.executeTheft(
                request.victimAccountNumber(),
                request.recipientAccountNumber(),
                amount,
                request.remarks() != null ? request.remarks() : "UNAUTHORIZED THEFT DRAIN"
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/victim-alerts/{accountNumber}")
    public ResponseEntity<List<?>> getVictimAlerts(@PathVariable("accountNumber") String accountNumber) {
        try {
            String url = zeroFraudBaseUrl.replaceAll("/+$", "") + "/api/fraud/alerts/victim/" + accountNumber;
            List<?> alerts = restTemplate.getForObject(url, List.class);
            return ResponseEntity.ok(alerts != null ? alerts : Collections.emptyList());
        } catch (Exception ex) {
            log.warn("Could not fetch victim alerts from ZeroFraud360: {}", ex.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @PostMapping("/victim-alerts/{alertId}/confirm")
    public ResponseEntity<Map<?, ?>> confirmFraudAsVictim(@PathVariable("alertId") String alertId) {
        try {
            String url = zeroFraudBaseUrl.replaceAll("/+$", "") + "/api/fraud/alerts/" + alertId + "/confirm-victim";
            Map<?, ?> res = restTemplate.postForObject(url, null, Map.class);
            return ResponseEntity.ok(res != null ? res : Map.of("status", "CONFIRMED_FRAUD"));
        } catch (Exception ex) {
            log.error("Failed to confirm fraud as victim for alertId {}: {}", alertId, ex.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/victim-alerts/{alertId}/release")
    public ResponseEntity<Map<?, ?>> releaseHoldAsVictim(@PathVariable("alertId") String alertId) {
        try {
            String url = zeroFraudBaseUrl.replaceAll("/+$", "") + "/api/fraud/alerts/" + alertId + "/release-victim";
            Map<?, ?> res = restTemplate.postForObject(url, null, Map.class);
            return ResponseEntity.ok(res != null ? res : Map.of("status", "RELEASED"));
        } catch (Exception ex) {
            log.error("Failed to release hold as victim for alertId {}: {}", alertId, ex.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", ex.getMessage()));
        }
    }
}
