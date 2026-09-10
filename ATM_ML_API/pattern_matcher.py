"""ATM & Cash Withdrawal Fraud Pattern Recognition & Operational Protocol Engine.

Maps suspicious transactions flagged by the LightGBM ATM Booster model to specific
fraud attack vectors and banking protocols, incorporating:
- Baseline withdrawal methods from 'withdrawal methods.docx'
- Pattern 39/40 (Cash-Out Burst) from 'updated dataset-1.0.docx'
- Pattern 61/62 (Cash-Digital Combination Drain) from 'updated dataset-1.0.docx'
- Terminal Impossible Travel / Remote ATM Cloning
- Off-Hours Nocturnal Brute-Force Cash-Outs
- AePS Micro-ATM Biometric Spoofs
"""

from __future__ import annotations

from typing import Any

# Standard Banking Action Protocols for ATM/Cash Withdrawal Fraud
PROTOCOLS = {
    "ATM_CARD_FREEZE": (
        "IMMEDIATE ACTION: Temporarily freeze debit card credential token at card switch. "
        "Trigger immediate SMS and push notification challenge to cardholder. "
        "Route incident to 24/7 Fraud Operations Desk (FOD) for immediate card replacement."
    ),
    "TERMINAL_HARD_BLOCK": (
        "IMMEDIATE ACTION: Abort cash dispensing signal at payment switch. "
        "Trigger ATM kiosk CCTV camera high-speed capture sequence. "
        "Lock card reader slot / retract card if skimmer detection sensors trip."
    ),
    "AEPS_BIOMETRIC_LOCK": (
        "COMPLIANCE ACTION: Issue instant biometric Aadhaar lock request to UIDAI switch. "
        "Flag Business Correspondent (BC/CSP) merchant terminal for regulatory audit. "
        "Require customer branch visit with physical biometric re-verification."
    ),
    "STEP_UP_OTP": (
        "STEP-UP ACTION: Hold cash dispensing in pending status on ATM screen. "
        "Dispatch 6-digit Out-of-Band (OOB) OTP to cardholder registered mobile. "
        "Auto-cancel and abort dispensing if OTP challenge is unverified within 120 seconds."
    ),
    "ALLOW_DISPENSE": (
        "STANDARD PASS: Approved without customer friction. Cash dispensed. "
        "Telemetry streamed to core banking event lake for customer profile refinement."
    ),
}


def match_fraud_pattern(
    features: dict[str, Any],
    fraud_score: float,
    top_shap_factors: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Matches an evaluated ATM/cash withdrawal against domain fraud patterns.

    Args:
        features: Dictionary of withdrawal features:
                  ['withdrawal_amount', 'channel_deviation_score', 'velocity_10m',
                   'velocity_24h', 'distance_from_last_terminal_km', 'is_off_hours',
                   'failed_auth_attempts', 'amount_to_avg_ratio']
        fraud_score: Predicted probability of fraud from LightGBM model (0.0 to 1.0).
        top_shap_factors: Optional list of top contributing features from Tree SHAP.

    Returns:
        Dictionary containing matched pattern details, attack vector description, and banking protocol.
    """
    amount = float(features.get("withdrawal_amount", 0.0))
    dev_score = float(features.get("channel_deviation_score", 0.0))
    vel_10m = int(features.get("velocity_10m", 0))
    vel_24h = int(features.get("velocity_24h", 0))
    distance_km = float(features.get("distance_from_last_terminal_km", 0.0))
    is_off_hours = int(features.get("is_off_hours", 0))
    failed_auth = int(features.get("failed_auth_attempts", 0))
    amt_ratio = float(features.get("amount_to_avg_ratio", 1.0))

    # Low risk - Normal legitimate withdrawal
    if fraud_score < 0.30:
        return {
            "pattern_id": "ATM_P0_LEGIT",
            "pattern_name": "Normal Baseline Cash Withdrawal",
            "threat_category": "BENIGN",
            "attack_vector_summary": (
                "Withdrawal aligns with customer's historical channel preferences, local geography, "
                "standard cash dispensing amounts, and nominal transaction pacing."
            ),
            "bank_action_protocol": PROTOCOLS["ALLOW_DISPENSE"],
            "matched_rules": ["channel_aligned", "nominal_velocity", "local_terminal"],
        }

    # 1. Terminal Impossible Travel / Remote ATM Clone (Pattern 36)
    # Characteristics: Terminal distance > 250 km, elevated amount or velocity
    if distance_km >= 250.0:
        return {
            "pattern_id": "ATM_P3_IMPOSSIBLE_TRAVEL",
            "pattern_name": "Remote Terminal Impossible Travel / Cloned Card (Pattern 36)",
            "threat_category": "CLONED_CARD_COUNTERFEIT",
            "attack_vector_summary": (
                f"Physical card swiped at an ATM terminal {distance_km:.1f} km away from previous activity. "
                "The geographical displacement within the short interval represents physically impossible transit, "
                "indicating magnetic stripe / EMV skimming clone or remote merchant terminal compromise."
            ),
            "bank_action_protocol": PROTOCOLS["TERMINAL_HARD_BLOCK"],
            "matched_rules": [
                f"impossible_terminal_distance ({distance_km:.1f} km)",
                "terminal_displacement_anomaly",
            ],
        }

    # 2. Cash-Out Burst / Rapid ATM Draining (Pattern 39/40 in Updated Dataset)
    # Characteristics: Rapid back-to-back withdrawals (velocity_10m >= 3 or velocity_24h >= 8) with high amount ratio
    if vel_10m >= 3 or (vel_24h >= 8 and vel_10m >= 2):
        return {
            "pattern_id": "ATM_P2_CASH_OUT_BURST",
            "pattern_name": "Cash-Out Burst / Rapid ATM Draining (Pattern 39/40)",
            "threat_category": "RAPID_DRAIN_ATTACK",
            "attack_vector_summary": (
                f"Detected rapid succession of cash withdrawals ({vel_10m} attempts in past 10 mins, "
                f"{vel_24h} in 24 hours) totaling elevated amounts ({amt_ratio:.1f}x normal baseline). "
                "Corresponds to rapid cash extraction typically seen in compromised PIN card drains or extortion."
            ),
            "bank_action_protocol": PROTOCOLS["ATM_CARD_FREEZE"],
            "matched_rules": [
                f"burst_velocity_10m ({vel_10m} txns in 10m)",
                f"elevated_24h_frequency ({vel_24h} txns)",
                f"high_amount_multiplier ({amt_ratio:.1f}x baseline)",
            ],
        }

    # 3. Sudden Unused Channel Exploitation (Channel Deviation Anomaly)
    # Characteristics: Channel deviation score >= 0.70 with substantial amount
    if dev_score >= 0.70:
        return {
            "pattern_id": "ATM_P1_CHANNEL_DEVIATION",
            "pattern_name": "Sudden Unused Channel Exploitation (Behavioral Anomaly)",
            "threat_category": "UNAUTHORIZED_CHANNEL_TAKEOVER",
            "attack_vector_summary": (
                f"Transaction initiated on a channel with extreme deviation ({dev_score:.2f} score) "
                "from customer's established withdrawal profile (e.g. 0% historical ATM/AePS usage). "
                f"Withdrawal amount of ₹{amount:,.2f} represents an abrupt break from customer banking history."
            ),
            "bank_action_protocol": PROTOCOLS["STEP_UP_OTP"] if fraud_score <= 0.70 else PROTOCOLS["ATM_CARD_FREEZE"],
            "matched_rules": [
                f"extreme_channel_deviation ({dev_score:.2f} / 1.0)",
                f"unusual_withdrawal_amount (₹{amount:,.2f})",
            ],
        }

    # 4. Nocturnal ATM Cash-Out with Prior Failed Auth Attempts
    # Characteristics: is_off_hours == 1 and failed_auth_attempts >= 2
    if is_off_hours == 1 and failed_auth >= 2:
        return {
            "pattern_id": "ATM_P5_NOCTURNAL_BURST",
            "pattern_name": "Nocturnal ATM Cash-Out with Auth Failures",
            "threat_category": "CREDENTIAL_BRUTE_FORCE_EXPLOITATION",
            "attack_vector_summary": (
                f"Withdrawal attempted during off-hours (23:00 - 05:00) preceded by {failed_auth} "
                "failed PIN or biometric authentication challenges. Suggests physical theft with PIN guessing "
                "or shoulder surfing during night hours."
            ),
            "bank_action_protocol": PROTOCOLS["TERMINAL_HARD_BLOCK"],
            "matched_rules": [
                "off_hours_operation (nocturnal window)",
                f"repeated_failed_auth ({failed_auth} prior failures)",
            ],
        }

    # 5. AePS Biometric Spoof / Rogue Micro-ATM Spike
    # Characteristics: channel deviation > 0.50, failed auth >= 1, amount >= 10,000
    if dev_score >= 0.50 and (failed_auth >= 1 or distance_km >= 50.0):
        return {
            "pattern_id": "ATM_P4_AEPS_BIOMETRIC_SPOOF",
            "pattern_name": "AePS Biometric Spoof / Rogue Micro-ATM Anomaly",
            "threat_category": "AEPS_BIOMETRIC_FRAUD",
            "attack_vector_summary": (
                f"Anomalous Aadhaar Enabled Payment System withdrawal of ₹{amount:,.2f} detected at remote "
                "Business Correspondent terminal with prior biometric mismatch flags. Suggests synthetic silicone "
                "fingerprint spoofing or dishonest CSP terminal operator manipulation."
            ),
            "bank_action_protocol": PROTOCOLS["AEPS_BIOMETRIC_LOCK"],
            "matched_rules": [
                "aeps_channel_anomaly",
                f"biometric_failure_history ({failed_auth} retries)",
                f"terminal_offset ({distance_km:.1f} km)",
            ],
        }

    # 6. Cash-Digital Combination Drain (Pattern 61/62)
    # Characteristics: High amount ratio >= 3.5, velocity_10m >= 2
    if amt_ratio >= 3.5 and (vel_10m >= 2 or is_off_hours == 1):
        return {
            "pattern_id": "ATM_P6_CASH_DIGITAL_DRAIN",
            "pattern_name": "Cash-Digital Combination Drain (Pattern 61/62)",
            "threat_category": "MULE_CASHOUT_TRANSITION",
            "attack_vector_summary": (
                f"High-volume cash withdrawal (₹{amount:,.2f}, {amt_ratio:.1f}x normal average) "
                "executed immediately following digital inflow, signaling mule pass-through cash-out."
            ),
            "bank_action_protocol": PROTOCOLS["ATM_CARD_FREEZE"],
            "matched_rules": [
                f"excessive_amount_ratio ({amt_ratio:.1f}x baseline)",
                f"velocity_burst ({vel_10m} txns in 10m)",
            ],
        }

    # Generic high risk fallback
    return {
        "pattern_id": "ATM_GENERIC_RISK",
        "pattern_name": "Elevated Cash Withdrawal Risk Anomaly",
        "threat_category": "ANOMALOUS_CASH_OUT",
        "attack_vector_summary": (
            f"Machine learning booster evaluated this transaction with a high fraud probability of {fraud_score * 100:.1f}%. "
            "Telemetry shows multiple anomalous deviations across withdrawal amount, timing, and velocity."
        ),
        "bank_action_protocol": PROTOCOLS["STEP_UP_OTP"] if fraud_score <= 0.70 else PROTOCOLS["ATM_CARD_FREEZE"],
        "matched_rules": ["composite_risk_score_exceeded"],
    }
