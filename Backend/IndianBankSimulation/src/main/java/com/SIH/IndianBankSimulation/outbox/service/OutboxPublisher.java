package com.SIH.IndianBankSimulation.outbox.service;

import com.SIH.IndianBankSimulation.outbox.domain.OutboxEvent;
import com.SIH.IndianBankSimulation.outbox.domain.OutboxStatus;
import com.SIH.IndianBankSimulation.outbox.dto.PaymentSuccessEvent;
import com.SIH.IndianBankSimulation.outbox.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class OutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    @Value("${bank.zerofraud360.events-url:http://localhost:8081/internal/v1/events/payment-success}")
    private String fraudEventsUrl;

    @Value("${bank.outbox.scheduler.enabled:true}")
    private boolean schedulerEnabled;

    public OutboxPublisher(OutboxEventRepository outboxEventRepository, ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(2000));
        requestFactory.setReadTimeout(Duration.ofMillis(3000));

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    public void publishEvent(OutboxEvent outboxEvent) {
        try {
            PaymentSuccessEvent eventDto = objectMapper.readValue(outboxEvent.getPayload(), PaymentSuccessEvent.class);
            restClient.post()
                    .uri(fraudEventsUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(eventDto)
                    .retrieve()
                    .toBodilessEntity();

            outboxEvent.setStatus(OutboxStatus.PROCESSED);
            outboxEvent.setProcessedAt(Instant.now());
            outboxEvent.setErrorMessage(null);
            outboxEventRepository.save(outboxEvent);
            log.info("Dispatched outbox event {} to ZeroFraud360 successfully", outboxEvent.getEventId());
        } catch (Exception ex) {
            outboxEvent.setRetryCount(outboxEvent.getRetryCount() + 1);
            outboxEvent.setErrorMessage(ex.getMessage());
            if (outboxEvent.getRetryCount() > 5) {
                outboxEvent.setStatus(OutboxStatus.FAILED);
            }
            outboxEventRepository.save(outboxEvent);
            log.warn("Failed to dispatch outbox event {} to ZeroFraud360 (attempt {}): {}",
                    outboxEvent.getEventId(), outboxEvent.getRetryCount(), ex.getMessage());
        }
    }

    @Scheduled(fixedDelayString = "${bank.outbox.publisher-interval-ms:5000}")
    @Transactional
    public void publishPendingEvents() {
        if (!schedulerEnabled) {
            return;
        }
        List<OutboxEvent> pendingEvents = outboxEventRepository.findAllByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING);
        for (OutboxEvent event : pendingEvents) {
            publishEvent(event);
        }
    }
}
