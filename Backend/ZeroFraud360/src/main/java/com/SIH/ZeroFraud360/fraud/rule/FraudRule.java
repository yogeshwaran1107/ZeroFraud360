package com.SIH.ZeroFraud360.fraud.rule;

import java.util.Optional;

public interface FraudRule {

    String getRuleName();

    Optional<FraudFinding> evaluate(PaymentContext context);
}
