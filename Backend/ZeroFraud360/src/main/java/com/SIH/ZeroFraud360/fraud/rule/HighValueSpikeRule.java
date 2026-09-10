package com.SIH.ZeroFraud360.fraud.rule;

import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

@Component
public class HighValueSpikeRule implements FraudRule {

    private static final Logger log = LoggerFactory.getLogger(HighValueSpikeRule.class);
    public static final String RULE_NAME = "HIGH_VALUE_SPIKE";

    @Value("${fraud.rules.high-value-spike.threshold:30000.00}")
    private BigDecimal threshold = new BigDecimal("30000.00");

    @Value("${fraud.rules.high-value-spike.enabled:true}")
    private boolean enabled = true;

    @Override
    public String getRuleName() {
        return RULE_NAME;
    }

    @Override
    public Optional<FraudFinding> evaluate(PaymentContext context) {
        if (!enabled) {
            return Optional.empty();
        }

        ObservedTransaction t = context.currentTransaction();
        if (t.getAmount() != null && t.getAmount().compareTo(threshold) >= 0) {
            log.warn("Detected HIGH_VALUE_SPIKE anomaly: txnId={}, sender={}, receiver={}, amount=₹{}",
                    t.getTransactionId(), t.getSenderAccountId(), t.getReceiverAccountId(), t.getAmount());

            String message = String.format(
                    "High-value payment spike of ₹%s from Account %s to Account %s exceeds automated safety monitoring threshold (₹%s). Is this legitimate or should funds be held for review?",
                    t.getAmount().stripTrailingZeros().toPlainString(),
                    t.getSenderAccountId(),
                    t.getReceiverAccountId(),
                    threshold.stripTrailingZeros().toPlainString()
            );

            return Optional.of(new FraudFinding(
                    RULE_NAME,
                    t.getTransactionId(),
                    t.getTransactionId(),
                    t.getSenderAccountId(),
                    t.getSenderAccountId(),
                    t.getReceiverAccountId(),
                    t.getAmount(),
                    t.getAmount(),
                    0L,
                    message
            ));
        }

        return Optional.empty();
    }
}
