package com.SIH.ZeroFraud360;

import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import com.SIH.ZeroFraud360.fraud.rule.FraudFinding;
import com.SIH.ZeroFraud360.fraud.rule.PaymentContext;
import com.SIH.ZeroFraud360.fraud.rule.RapidPassThroughRule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class RapidPassThroughRuleTest {

    private RapidPassThroughRule rule;

    @BeforeEach
    void setUp() {
        rule = new RapidPassThroughRule(180); // 3 minutes window
    }

    @Test
    @DisplayName("Detects rapid pass-through A -> B -> C within 60 seconds and equal amount")
    void testDetectsRapidPassThroughWithin60Seconds() {
        Instant t1Time = Instant.parse("2026-09-10T10:00:00Z");
        Instant t2Time = Instant.parse("2026-09-10T10:01:00Z"); // 60s later

        ObservedTransaction t1 = new ObservedTransaction(
                "EVT-1", "TXN-1", "1000000001", "2000000001", "BANK_A", "BANK_B",
                new BigDecimal("10000.00"), "INR", "SIMULATED_UPI", "SUCCESS", "CORR-1", "MSG-1", t1Time
        );

        ObservedTransaction t2 = new ObservedTransaction(
                "EVT-2", "TXN-2", "2000000001", "3000000001", "BANK_B", "BANK_C",
                new BigDecimal("10000.00"), "INR", "SIMULATED_UPI", "SUCCESS", "CORR-2", "MSG-2", t2Time
        );

        PaymentContext context = new PaymentContext(t2, List.of(t1));
        Optional<FraudFinding> findingOpt = rule.evaluate(context);

        assertThat(findingOpt).isPresent();
        FraudFinding finding = findingOpt.get();
        assertThat(finding.firstTransactionId()).isEqualTo("TXN-1");
        assertThat(finding.secondTransactionId()).isEqualTo("TXN-2");
        assertThat(finding.sourceAccountId()).isEqualTo("1000000001");
        assertThat(finding.intermediateAccountId()).isEqualTo("2000000001");
        assertThat(finding.destinationAccountId()).isEqualTo("3000000001");
        assertThat(finding.timeDifferenceSeconds()).isEqualTo(60);
        assertThat(finding.riskLevel()).isEqualTo("MEDIUM");
        assertThat(finding.message()).contains("1000000001 sent ₹10000 to Account 2000000001 and Account 2000000001 immediately forwarded ₹10000 to Account 3000000001 within 1 minute");
    }

    @Test
    @DisplayName("Rejects pass-through if time difference exceeds 3 minutes (e.g. 240 seconds)")
    void testRejectsExceeding3Minutes() {
        Instant t1Time = Instant.parse("2026-09-10T10:00:00Z");
        Instant t2Time = Instant.parse("2026-09-10T10:04:00Z"); // 4 minutes later

        ObservedTransaction t1 = new ObservedTransaction(
                "EVT-1", "TXN-1", "1000000001", "2000000001", "BANK_A", "BANK_B",
                new BigDecimal("10000.00"), "INR", "SIMULATED_UPI", "SUCCESS", "CORR-1", "MSG-1", t1Time
        );

        ObservedTransaction t2 = new ObservedTransaction(
                "EVT-2", "TXN-2", "2000000001", "3000000001", "BANK_B", "BANK_C",
                new BigDecimal("10000.00"), "INR", "SIMULATED_UPI", "SUCCESS", "CORR-2", "MSG-2", t2Time
        );

        PaymentContext context = new PaymentContext(t2, List.of(t1));
        Optional<FraudFinding> findingOpt = rule.evaluate(context);

        assertThat(findingOpt).isEmpty();
    }

    @Test
    @DisplayName("Rejects pass-through if amount is completely unrelated (e.g. ₹10,000 vs ₹2,000)")
    void testRejectsDifferentAmount() {
        Instant t1Time = Instant.parse("2026-09-10T10:00:00Z");
        Instant t2Time = Instant.parse("2026-09-10T10:01:00Z");

        ObservedTransaction t1 = new ObservedTransaction(
                "EVT-1", "TXN-1", "1000000001", "2000000001", "BANK_A", "BANK_B",
                new BigDecimal("10000.00"), "INR", "SIMULATED_UPI", "SUCCESS", "CORR-1", "MSG-1", t1Time
        );

        ObservedTransaction t2 = new ObservedTransaction(
                "EVT-2", "TXN-2", "2000000001", "3000000001", "BANK_B", "BANK_C",
                new BigDecimal("2000.00"), "INR", "SIMULATED_UPI", "SUCCESS", "CORR-2", "MSG-2", t2Time
        );

        PaymentContext context = new PaymentContext(t2, List.of(t1));
        Optional<FraudFinding> findingOpt = rule.evaluate(context);

        assertThat(findingOpt).isEmpty();
    }
}
