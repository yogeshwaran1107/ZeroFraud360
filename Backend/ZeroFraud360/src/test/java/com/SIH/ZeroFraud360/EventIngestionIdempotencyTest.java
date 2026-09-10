package com.SIH.ZeroFraud360;

import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import com.SIH.ZeroFraud360.event.domain.ProcessedEvent;
import com.SIH.ZeroFraud360.event.dto.AccountParticipantDto;
import com.SIH.ZeroFraud360.event.dto.PaymentSuccessEvent;
import com.SIH.ZeroFraud360.event.repository.ObservedTransactionRepository;
import com.SIH.ZeroFraud360.event.repository.ProcessedEventRepository;
import com.SIH.ZeroFraud360.event.service.PaymentEventProcessor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class EventIngestionIdempotencyTest {

    @Autowired
    private PaymentEventProcessor paymentEventProcessor;

    @Autowired
    private ProcessedEventRepository processedEventRepository;

    @Autowired
    private ObservedTransactionRepository transactionRepository;

    @BeforeEach
    void cleanUp() {
        processedEventRepository.deleteAll();
        transactionRepository.deleteAll();
    }

    @Test
    @DisplayName("Duplicate event delivery does not create duplicate processed_events or observed_transactions")
    void testEventIngestionIdempotency() {
        PaymentSuccessEvent event = new PaymentSuccessEvent(
                "EVT-IDEMPOTENT-001",
                "PAYMENT_SUCCESS",
                "TXN-IDEMPOTENT-001",
                Instant.now(),
                new AccountParticipantDto("ACC-A", "1000000001", "BANK_A"),
                new AccountParticipantDto("ACC-B", "2000000001", "BANK_B"),
                new BigDecimal("5000.00"),
                "INR",
                "SIMULATED_UPI",
                "CORR-IDEMP",
                "MSG-IDEMP"
        );

        // First ingestion
        paymentEventProcessor.process(event);

        List<ProcessedEvent> processed1 = processedEventRepository.findAll();
        assertThat(processed1).hasSize(1);
        assertThat(processed1.get(0).getEventId()).isEqualTo("EVT-IDEMPOTENT-001");

        List<ObservedTransaction> txns1 = transactionRepository.findAll();
        assertThat(txns1).hasSize(1);
        assertThat(txns1.get(0).getTransactionId()).isEqualTo("TXN-IDEMPOTENT-001");

        // Second ingestion (replay / retry)
        paymentEventProcessor.process(event);

        List<ProcessedEvent> processed2 = processedEventRepository.findAll();
        assertThat(processed2).hasSize(1); // Still 1

        List<ObservedTransaction> txns2 = transactionRepository.findAll();
        assertThat(txns2).hasSize(1); // Still 1
    }
}
