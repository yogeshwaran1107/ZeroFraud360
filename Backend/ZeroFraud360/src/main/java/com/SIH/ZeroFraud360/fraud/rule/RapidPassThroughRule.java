package com.SIH.ZeroFraud360.fraud.rule;

import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
public class RapidPassThroughRule implements FraudRule {

    private static final Logger log = LoggerFactory.getLogger(RapidPassThroughRule.class);
    public static final String RULE_NAME = "RAPID_PASS_THROUGH";

    @Value("${fraud.rules.rapid-pass-through.max-time-window-seconds:180}")
    private long maxTimeWindowSeconds;

    public RapidPassThroughRule() {
    }

    public RapidPassThroughRule(long maxTimeWindowSeconds) {
        this.maxTimeWindowSeconds = maxTimeWindowSeconds;
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
            long diffSeconds = Duration.between(t1.getOccurredAt(), t2.getOccurredAt()).getSeconds();
            if (diffSeconds > maxTimeWindowSeconds) {
                continue;
            }

            // Condition: T1.receiverAccountId == T2.senderAccountId
            if (!t1.getReceiverAccountId().equals(t2.getSenderAccountId())) {
                continue;
            }

            // Condition: T1.amount == T2.amount
            if (t1.getAmount().compareTo(t2.getAmount()) != 0) {
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

            String message = String.format(
                    "Account %s sent ₹%s to Account %s and Account %s sent ₹%s to Account %s within %s of the first transaction. Is this fraud and should this transaction be stopped?",
                    t1.getSenderAccountId(), t1.getAmount().stripTrailingZeros().toPlainString(), t1.getReceiverAccountId(),
                    t2.getSenderAccountId(), t2.getAmount().stripTrailingZeros().toPlainString(), t2.getReceiverAccountId(),
                    minuteUnit
            );

            log.warn("Detected RAPID_PASS_THROUGH money-flow anomaly: T1={} (occurred={}), T2={} (occurred={}), diff={}s",
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
                    message
            ));
        }

        return Optional.empty();
    }
}
