package com.SIH.ZeroFraud360.fraud.tracker;

import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import com.SIH.ZeroFraud360.event.repository.ObservedTransactionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class MoneyFlowTracker {

    private final ObservedTransactionRepository transactionRepository;

    @Value("${fraud.rules.rapid-pass-through.max-time-window-seconds:180}")
    private long maxTimeWindowSeconds;

    public MoneyFlowTracker(ObservedTransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    public List<ObservedTransaction> findCandidateInflows(ObservedTransaction outgoingTransaction) {
        Instant windowStart = outgoingTransaction.getOccurredAt().minus(Duration.ofSeconds(maxTimeWindowSeconds));
        return transactionRepository.findCandidateInflows(
                outgoingTransaction.getSenderAccountId(),
                windowStart,
                outgoingTransaction.getOccurredAt()
        );
    }
}
