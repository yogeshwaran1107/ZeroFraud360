package com.SIH.ZeroFraud360.fraud.rule;

import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import com.SIH.ZeroFraud360.event.repository.ObservedTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Component
public class RapidPassThroughRule implements FraudRule {

    private static final Logger log = LoggerFactory.getLogger(RapidPassThroughRule.class);
    public static final String RULE_NAME = "RAPID_PASS_THROUGH";
    public static final String MULTI_HOP_RULE_NAME = "MULTI_HOP_FRAUD_CHAIN";

    @Value("${fraud.rules.rapid-pass-through.max-time-window-seconds:180}")
    private long maxTimeWindowSeconds = 180;

    private final ObservedTransactionRepository transactionRepository;

    public RapidPassThroughRule() {
        this.transactionRepository = null;
    }

    @Autowired
    public RapidPassThroughRule(ObservedTransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    public RapidPassThroughRule(long maxTimeWindowSeconds) {
        this.maxTimeWindowSeconds = maxTimeWindowSeconds;
        this.transactionRepository = null;
    }

    public RapidPassThroughRule(long maxTimeWindowSeconds, ObservedTransactionRepository transactionRepository) {
        this.maxTimeWindowSeconds = maxTimeWindowSeconds;
        this.transactionRepository = transactionRepository;
    }

    @Override
    public String getRuleName() {
        return RULE_NAME;
    }

    @Override
    public Optional<FraudFinding> evaluate(PaymentContext context) {
        ObservedTransaction t2 = context.currentTransaction();

        for (ObservedTransaction t1 : context.candidatePriorTransactions()) {
            // Condition: T1 occurred strictly before T2
            if (!t1.getOccurredAt().isBefore(t2.getOccurredAt())) {
                continue;
            }

            // Condition: T2.occurredAt - T1.occurredAt <= maxTimeWindowSeconds (3 minutes default)
            long diffSeconds = Math.abs(Duration.between(t1.getOccurredAt(), t2.getOccurredAt()).getSeconds());
            if (diffSeconds > maxTimeWindowSeconds) {
                continue;
            }

            // Condition: T1.receiverAccountId == T2.senderAccountId
            if (!t1.getReceiverAccountId().equals(t2.getSenderAccountId())) {
                continue;
            }

            // Condition: T1.amount == T2.amount OR rapid mule ratio pass-through (60% - 105%)
            boolean exactAmount = t1.getAmount().compareTo(t2.getAmount()) == 0;
            boolean ratioMatch = t1.getAmount().compareTo(java.math.BigDecimal.ZERO) > 0 &&
                    t2.getAmount().doubleValue() >= (t1.getAmount().doubleValue() * 0.60) &&
                    t2.getAmount().doubleValue() <= (t1.getAmount().doubleValue() * 1.05);

            if (!exactAmount && !ratioMatch) {
                continue;
            }

            // Condition: T1.currency == T2.currency
            if (!t1.getCurrency().equalsIgnoreCase(t2.getCurrency())) {
                continue;
            }

            // Condition: Both must be SUCCESS and not reversals
            if (!"SUCCESS".equalsIgnoreCase(t1.getStatus()) || !"SUCCESS".equalsIgnoreCase(t2.getStatus())) {
                continue;
            }

            long elapsedMinutes = Math.max(1, (diffSeconds + 59) / 60);
            String minuteUnit = elapsedMinutes == 1 ? "1 minute" : elapsedMinutes + " minutes";

            // Check if T1 itself had a candidate inflow within the window (indicating Hop 3+ escalation)
            ObservedTransaction t0 = null;
            if (transactionRepository != null) {
                Instant windowStart = t1.getOccurredAt().minus(Duration.ofSeconds(maxTimeWindowSeconds));
                List<ObservedTransaction> priorInflows = transactionRepository.findCandidateInflows(
                        t1.getSenderAccountId(), windowStart, t1.getOccurredAt());

                for (ObservedTransaction candidate0 : priorInflows) {
                    if ("SUCCESS".equalsIgnoreCase(candidate0.getStatus())) {
                        boolean match0 = candidate0.getAmount().compareTo(t1.getAmount()) == 0 ||
                                (candidate0.getAmount().compareTo(java.math.BigDecimal.ZERO) > 0 &&
                                        t1.getAmount().doubleValue() >= (candidate0.getAmount().doubleValue() * 0.60) &&
                                        t1.getAmount().doubleValue() <= (candidate0.getAmount().doubleValue() * 1.05));
                        if (match0) {
                            t0 = candidate0;
                            break;
                        }
                    }
                }
            }

            if (t0 != null) {
                // Hop 3+ Detected: Escalated to Critical Multi-Hop Fraud Chain
                String message = String.format(
                        "CRITICAL FRAUD: Multi-Hop Money Mule Chain detected! Account %s forwarded ₹%s to Account %s, then to Account %s, which immediately transferred ₹%s to Account %s within %s. Immediate STOP & HOLD enforced on participating accounts.",
                        t0.getSenderAccountId(), t0.getAmount().stripTrailingZeros().toPlainString(),
                        t1.getSenderAccountId(), t2.getSenderAccountId(),
                        t2.getAmount().stripTrailingZeros().toPlainString(), t2.getReceiverAccountId(),
                        minuteUnit
                );

                log.warn("Detected MULTI_HOP_FRAUD_CHAIN: T0={} (A={}), T1={} (B={}), T2={} (C={}), Recipient={}",
                        t0.getTransactionId(), t0.getSenderAccountId(),
                        t1.getTransactionId(), t1.getSenderAccountId(),
                        t2.getTransactionId(), t2.getSenderAccountId(),
                        t2.getReceiverAccountId());

                return Optional.of(new FraudFinding(
                        MULTI_HOP_RULE_NAME,
                        t1.getTransactionId(),
                        t2.getTransactionId(),
                        t0.getSenderAccountId(), // Root source
                        t2.getSenderAccountId(), // Current forwarding mule
                        t2.getReceiverAccountId(), // Final cashout/destination
                        t1.getAmount(),
                        t2.getAmount(),
                        diffSeconds,
                        message,
                        "CRITICAL",
                        3
                ));
            } else {
                // Hop 2 Detected: Medium Fraud Chance (Rapid 2-Hop Pass-Through)
                String message = String.format(
                        "Medium Fraud Chance: Account %s sent ₹%s to Account %s and Account %s immediately forwarded ₹%s to Account %s within %s. Flagged as suspicious pass-through for compliance surveillance.",
                        t1.getSenderAccountId(), t1.getAmount().stripTrailingZeros().toPlainString(), t1.getReceiverAccountId(),
                        t2.getSenderAccountId(), t2.getAmount().stripTrailingZeros().toPlainString(), t2.getReceiverAccountId(),
                        minuteUnit
                );

                log.warn("Detected RAPID_PASS_THROUGH (Medium Fraud Chance): T1={} (occurred={}), T2={} (occurred={}), diff={}s",
                        t1.getTransactionId(), t1.getOccurredAt(), t2.getTransactionId(), t2.getOccurredAt(), diffSeconds);

                return Optional.of(new FraudFinding(
                        RULE_NAME,
                        t1.getTransactionId(),
                        t2.getTransactionId(),
                        t1.getSenderAccountId(),
                        t2.getSenderAccountId(),
                        t2.getReceiverAccountId(),
                        t1.getAmount(),
                        t2.getAmount(),
                        diffSeconds,
                        message,
                        "MEDIUM",
                        2
                ));
            }
        }

        return Optional.empty();
    }
}
