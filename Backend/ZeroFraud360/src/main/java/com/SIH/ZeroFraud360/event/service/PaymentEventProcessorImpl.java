package com.SIH.ZeroFraud360.event.service;

import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import com.SIH.ZeroFraud360.event.domain.ProcessedEvent;
import com.SIH.ZeroFraud360.event.dto.PaymentSuccessEvent;
import com.SIH.ZeroFraud360.event.repository.ObservedTransactionRepository;
import com.SIH.ZeroFraud360.event.repository.ProcessedEventRepository;
import com.SIH.ZeroFraud360.fraud.rule.FraudFinding;
import com.SIH.ZeroFraud360.fraud.rule.HighValueSpikeRule;
import com.SIH.ZeroFraud360.fraud.rule.PaymentContext;
import com.SIH.ZeroFraud360.fraud.rule.RapidPassThroughRule;
import com.SIH.ZeroFraud360.fraud.service.FraudAlertService;
import com.SIH.ZeroFraud360.fraud.tracker.MoneyFlowTracker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class PaymentEventProcessorImpl implements PaymentEventProcessor {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventProcessorImpl.class);
    private static final String CONSUMER_NAME = "PAYMENT_PROCESSOR";

    private final ProcessedEventRepository processedEventRepository;
    private final ObservedTransactionRepository transactionRepository;
    private final MoneyFlowTracker moneyFlowTracker;
    private final RapidPassThroughRule rapidPassThroughRule;
    private final HighValueSpikeRule highValueSpikeRule;
    private final FraudAlertService fraudAlertService;

    public PaymentEventProcessorImpl(ProcessedEventRepository processedEventRepository,
                                     ObservedTransactionRepository transactionRepository,
                                     MoneyFlowTracker moneyFlowTracker,
                                     RapidPassThroughRule rapidPassThroughRule,
                                     HighValueSpikeRule highValueSpikeRule,
                                     FraudAlertService fraudAlertService) {
        this.processedEventRepository = processedEventRepository;
        this.transactionRepository = transactionRepository;
        this.moneyFlowTracker = moneyFlowTracker;
        this.rapidPassThroughRule = rapidPassThroughRule;
        this.highValueSpikeRule = highValueSpikeRule;
        this.fraudAlertService = fraudAlertService;
    }

    @Override
    @Transactional
    public void process(PaymentSuccessEvent event) {
        // Step 1: Idempotency check
        if (processedEventRepository.existsByEventIdAndConsumerName(event.eventId(), CONSUMER_NAME)) {
            log.info("Duplicate event detected: eventId={}, consumerName={}. Skipping.", event.eventId(), CONSUMER_NAME);
            return;
        }

        // Step 2: Record processed event
        ProcessedEvent processedEvent = new ProcessedEvent(event.eventId(), event.eventType(), CONSUMER_NAME);
        processedEventRepository.save(processedEvent);

        // Step 3: Persist ObservedTransaction
        ObservedTransaction transaction = transactionRepository.findByEventId(event.eventId())
                .orElseGet(() -> {
                    ObservedTransaction ot = new ObservedTransaction(
                            event.eventId(),
                            event.transactionId(),
                            event.sender().accountNumber(),
                            event.receiver().accountNumber(),
                            event.sender().bankId(),
                            event.receiver().bankId(),
                            event.amount(),
                            event.currency(),
                            event.paymentRail(),
                            "SUCCESS",
                            event.correlationId(),
                            event.messageId(),
                            event.occurredAt()
                    );
                    return transactionRepository.save(ot);
                });

        log.info("Recorded observed transaction: txnId={}, sender={}, receiver={}, amount={}, occurredAt={}",
                transaction.getTransactionId(), transaction.getSenderAccountId(), transaction.getReceiverAccountId(),
                transaction.getAmount(), transaction.getOccurredAt());

        // Step 4: Track money flow & evaluate rules
        List<ObservedTransaction> candidates = moneyFlowTracker.findCandidateInflows(transaction);
        PaymentContext context = new PaymentContext(transaction, candidates);

        Optional<FraudFinding> findingOpt = rapidPassThroughRule.evaluate(context);
        if (findingOpt.isPresent()) {
            FraudFinding finding = findingOpt.get();
            ObservedTransaction t1 = candidates.stream()
                    .filter(c -> c.getTransactionId().equals(finding.firstTransactionId()))
                    .findFirst()
                    .orElse(transaction);

            fraudAlertService.createAlertAndEvaluate(finding, t1, transaction);
        } else {
            Optional<FraudFinding> spikeFindingOpt = highValueSpikeRule.evaluate(context);
            if (spikeFindingOpt.isPresent()) {
                FraudFinding spikeFinding = spikeFindingOpt.get();
                fraudAlertService.createAlertAndEvaluate(spikeFinding, transaction, transaction);
            }
        }
    }
}
