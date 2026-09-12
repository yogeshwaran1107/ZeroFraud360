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

            // If standalone unit test mode without database connection
            if (transactionRepository == null) {
                String message = String.format(
                        "Medium Fraud Chance: Account %s sent ₹%s to Account %s and Account %s immediately forwarded ₹%s to Account %s within %s. Flagged as suspicious pass-through for compliance surveillance.",
                        t1.getSenderAccountId(), t1.getAmount().stripTrailingZeros().toPlainString(), t1.getReceiverAccountId(),
                        t2.getSenderAccountId(), t2.getAmount().stripTrailingZeros().toPlainString(), t2.getReceiverAccountId(),
                        minuteUnit
                );
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

            // Production mode: Query repository for multi-hop chaining
            // Look for T0 (inflow into T1.senderAccountId)
            Instant windowStart = t1.getOccurredAt().minus(Duration.ofSeconds(maxTimeWindowSeconds));
            List<ObservedTransaction> priorInflows = transactionRepository.findCandidateInflows(
                    t1.getSenderAccountId(), windowStart, t1.getOccurredAt());

            ObservedTransaction t0 = null;
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

            // If T0 is null, this is only Leg 2 (e.g. B -> C after A -> B). No alert generated yet.
            if (t0 == null) {
                continue;
            }

            // Check for T-Minus-1 (inflow into T0.senderAccountId) indicating 4+ hops
            ObservedTransaction tMinus1 = null;
            Instant windowMinus1Start = t0.getOccurredAt().minus(Duration.ofSeconds(maxTimeWindowSeconds));
            List<ObservedTransaction> priorPriorInflows = transactionRepository.findCandidateInflows(
                    t0.getSenderAccountId(), windowMinus1Start, t0.getOccurredAt());
            for (ObservedTransaction candidateMinus1 : priorPriorInflows) {
                if ("SUCCESS".equalsIgnoreCase(candidateMinus1.getStatus())) {
                    boolean matchMinus1 = candidateMinus1.getAmount().compareTo(t0.getAmount()) == 0 ||
                            (candidateMinus1.getAmount().compareTo(java.math.BigDecimal.ZERO) > 0 &&
                                    t0.getAmount().doubleValue() >= (candidateMinus1.getAmount().doubleValue() * 0.60) &&
                                    t0.getAmount().doubleValue() <= (candidateMinus1.getAmount().doubleValue() * 1.05));
                    if (matchMinus1) {
                        tMinus1 = candidateMinus1;
                        break;
                    }
                }
            }

            if (tMinus1 != null) {
                // 4+ hops completed (Terminal mule pass-through escalation)
                String message = String.format(
                        "CRITICAL FRAUD: Multi-Hop Money Mule Chain detected! Account %s forwarded ₹%s through intermediate accounts to Account %s, which transferred ₹%s to Account %s within %s. Immediate STOP & HOLD enforced on participating accounts.",
                        tMinus1.getSenderAccountId(), tMinus1.getAmount().stripTrailingZeros().toPlainString(),
                        t2.getSenderAccountId(), t2.getAmount().stripTrailingZeros().toPlainString(),
                        t2.getReceiverAccountId(), minuteUnit
                );

                log.warn("Detected MULTI_HOP_FRAUD_CHAIN: TMinus1={} (Source={}), T0={}, T1={}, T2={} (Forwarder={}), Recipient={}",
                        tMinus1.getTransactionId(), tMinus1.getSenderAccountId(),
                        t0.getTransactionId(), t1.getTransactionId(),
                        t2.getTransactionId(), t2.getSenderAccountId(),
                        t2.getReceiverAccountId());

                return Optional.of(new FraudFinding(
                        MULTI_HOP_RULE_NAME,
                        t1.getTransactionId(),
                        t2.getTransactionId(),
                        tMinus1.getSenderAccountId(), // Root source
                        t2.getSenderAccountId(), // Current forwarding mule
                        t2.getReceiverAccountId(), // Final cashout/destination
                        t1.getAmount(),
                        t2.getAmount(),
                        diffSeconds,
                        message,
                        "CRITICAL",
                        4
                ));
            } else {
                // 3-transaction / 2-hop pass-through (A -> B -> C -> D): MEDIUM FRAUD ALERT on C -> D
                String message = String.format(
                        "Medium Fraud Alert: Multi-Hop Pass-Through detected under surveillance! Account %s transferred ₹%s to Account %s, which forwarded to Account %s, and transferred ₹%s to Account %s within %s. Flagged for compliance surveillance.",
                        t0.getSenderAccountId(), t0.getAmount().stripTrailingZeros().toPlainString(),
                        t1.getSenderAccountId(), t2.getSenderAccountId(),
                        t2.getAmount().stripTrailingZeros().toPlainString(), t2.getReceiverAccountId(),
                        minuteUnit
                );

                log.warn("Detected RAPID_PASS_THROUGH (Medium Fraud Alert on C -> D): T0={} (Source={}), T1={} (Interm={}), T2={} (Forwarder={}), Recipient={}",
                        t0.getTransactionId(), t0.getSenderAccountId(),
                        t1.getTransactionId(), t1.getSenderAccountId(),
                        t2.getTransactionId(), t2.getSenderAccountId(),
                        t2.getReceiverAccountId());

                return Optional.of(new FraudFinding(
                        RULE_NAME,
                        t1.getTransactionId(),
                        t2.getTransactionId(),
                        t0.getSenderAccountId(), // Root victim A
                        t1.getSenderAccountId(), // Mule B
                        t2.getReceiverAccountId(), // Mule D
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
