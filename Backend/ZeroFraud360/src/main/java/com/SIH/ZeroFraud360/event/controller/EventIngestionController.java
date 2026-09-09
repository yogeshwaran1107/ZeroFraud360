package com.SIH.ZeroFraud360.event.controller;

import com.SIH.ZeroFraud360.event.dto.PaymentSuccessEvent;
import com.SIH.ZeroFraud360.event.service.PaymentEventProcessor;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/internal/v1/events")
public class EventIngestionController {

    private final PaymentEventProcessor eventProcessor;

    public EventIngestionController(PaymentEventProcessor eventProcessor) {
        this.eventProcessor = eventProcessor;
    }

    @PostMapping("/payment-success")
    public ResponseEntity<Map<String, String>> ingestPaymentSuccessEvent(@Valid @RequestBody PaymentSuccessEvent event) {
        eventProcessor.process(event);
        return ResponseEntity.ok(Map.of(
                "eventId", event.eventId(),
                "status", "PROCESSED"
        ));
    }
}
