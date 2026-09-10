package com.SIH.IndianBankSimulation.payment.controller;

import com.SIH.IndianBankSimulation.payment.dto.PaymentTransferRequest;
import com.SIH.IndianBankSimulation.payment.dto.PaymentTransferResponse;
import com.SIH.IndianBankSimulation.payment.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/api/payments/transfer")
    public ResponseEntity<PaymentTransferResponse> transfer(@Valid @RequestBody PaymentTransferRequest request) {
        PaymentTransferResponse response = paymentService.executePayment(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/internal/v1/payments/transfer")
    public ResponseEntity<PaymentTransferResponse> internalTransfer(@Valid @RequestBody PaymentTransferRequest request) {
        PaymentTransferResponse response = paymentService.executePayment(request);
        return ResponseEntity.ok(response);
    }

    @org.springframework.web.bind.annotation.GetMapping("/api/payments/history/{accountNumber}")
    public ResponseEntity<java.util.List<com.SIH.IndianBankSimulation.payment.domain.PaymentTransaction>> getHistory(
            @org.springframework.web.bind.annotation.PathVariable String accountNumber) {
        return ResponseEntity.ok(paymentService.getTransactionsForAccount(accountNumber));
    }
}
