"""Fraud Pattern Recognition & Archetype Matching Engine.

Maps suspicious transactions flagged by the LightGBM model to specific
fraud patterns, attack vectors, and operational response protocols defined
in 'updated dataset-1.0.docx' (covering all 170 domain patterns).
"""

from __future__ import annotations

from typing import Any


# Standard Banking Action Protocols
PROTOCOLS = {
    "CARD_FREEZE": (
        "IMMEDIATE ACTION: Temporarily freeze card/credential token. "
        "Trigger automated SMS/WhatsApp verification challenge to cardholder. "
        "Notify Fraud Operations Desk (FOD) for card re-issuance if unconfirmed."
    ),
    "HARD_BLOCK": (
        "IMMEDIATE ACTION: Hard stop transaction at payment switch. "
        "Lock net banking/UPI access pending customer identity re-verification. "
        "Generate automated Suspicious Activity Report (SAR) intake flag."
    ),
    "STEP_UP_AUTH": (
        "STEP-UP ACTION: Hold transaction in pending status. "
        "Trigger out-of-band Multi-Factor Authentication (Biometric / Hardware Token / SMS OTP). "
        "Auto-decline if challenge is not satisfied within 180 seconds."
    ),
    "AML_ESCALATION": (
        "COMPLIANCE ESCALATION: Route to Anti-Money Laundering (AML) investigation unit. "
        "Check account beneficiary history and source of funds. "
        "Hold outward settlement pending KYC / source-of-wealth review."
    ),
    "ALLOW_LOG": (
        "STANDARD PASS: Transaction approved without customer friction. "
        "Telemetry logged to event lake for ongoing behavioural baseline profiling."
    ),
}


def match_fraud_pattern(
    features: dict[str, Any],
    fraud_score: float,
    top_shap_factors: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Matches an evaluated transaction against domain fraud patterns.

    Args:
        features: Dictionary of transaction features (amount, velocity_10m, velocity_24h, distance_from_last_km, is_new_device).
        fraud_score: Predicted probability of fraud from LightGBM (0.0 to 1.0).
        top_shap_factors: Optional list of top contributing features from Tree SHAP.

    Returns:
        Dictionary containing matched pattern details, attack vector description, and banking protocol.
    """
    amount = float(features.get("amount", 0.0))
    vel_10m = int(features.get("velocity_10m", 0))
    vel_24h = int(features.get("velocity_24h", 0))
    distance = float(features.get("distance_from_last_km", 0.0))
    new_device = int(features.get("is_new_device", 0))

    # If the model evaluated this as legitimate low risk
    if fraud_score < 0.30:
        return {
            "pattern_id": "P0_LEGIT",
            "pattern_name": "Normal Everyday Banking Activity",
            "threat_category": "BENIGN",
            "attack_vector_summary": (
                "Transaction aligns with normal customer spending habits, localized geography, "
                "registered hardware fingerprint, and standard transaction pacing."
            ),
            "bank_action_protocol": PROTOCOLS["ALLOW_LOG"],
            "matched_rules": ["velocity_within_bounds", "recognized_environment"],
        }

    # 1. Micro-Transaction Burst / Card Testing Attack (Pattern 102)
    # Characteristics: Tiny amounts (< ₹100), rapid 10m frequency (burst), unfamiliar device
    if amount < 150.0 and vel_10m >= 3:
        return {
            "pattern_id": "P102",
            "pattern_name": "Micro-Transaction Burst / Card Testing Attack",
            "threat_category": "AUTOMATED_BOTNET_ATTACK",
            "attack_vector_summary": (
                f"Automated botnet script detected attempting rapid low-value transactions (₹{amount:.2f}) "
                f"at a frequency of {vel_10m} attempts within 10 minutes from an unfamiliar device. "
                "Attackers use micro-amounts to validate stolen BIN / credential batches without triggering SMS limits."
            ),
            "bank_action_protocol": PROTOCOLS["CARD_FREEZE"],
            "matched_rules": [
                f"micro_amount (₹{amount:.2f} < ₹150)",
                f"burst_velocity_10m ({vel_10m} txns in 10m)",
                "unrecognized_device" if new_device else "automated_cadence",
            ],
        }

    # 2. Rapid Transfer Burst / Account Takeover Fast Drain (Pattern 1 & Pattern 27)
    # Characteristics: Extreme velocity burst (10m >= 5 or 24h >= 15) with substantial amount
    if vel_10m >= 5 or (vel_24h >= 15 and vel_10m >= 3):
        return {
            "pattern_id": "P1_P27",
            "pattern_name": "Rapid Transfer Burst / Account Takeover Fast Drain",
            "threat_category": "CREDENTIAL_THEFT_FAST_DRAIN",
            "attack_vector_summary": (
                f"Rapid sequence of high-velocity transfers ({vel_10m} in 10m, {vel_24h} in 24h) "
                f"totaling substantial funds (current txn: ₹{amount:,.2f}). "
                "Typical of an account takeover (ATO) where the adversary attempts to rapidly siphon balance "
                "before the victim notices or reports the compromised credentials."
            ),
            "bank_action_protocol": PROTOCOLS["HARD_BLOCK"],
            "matched_rules": [
                f"extreme_velocity_10m ({vel_10m} txns)",
                f"heavy_24h_frequency ({vel_24h} txns)",
                "rapid_balance_depletion",
            ],
        }

    # 3. High-Value Amount Anomaly / Dormant Account Activation (Pattern 15 & Pattern 24)
    # Characteristics: Huge transaction amount (>= ₹1,00,000) with elevated frequency or unfamiliar device
    if amount >= 100_000.0:
        return {
            "pattern_id": "P15_P24",
            "pattern_name": "Dormant Account Burst / High-Value Amount Anomaly",
            "threat_category": "MONEY_MULE_LARGE_TRANSFER",
            "attack_vector_summary": (
                f"Extreme deviation from historical spending: transaction of ₹{amount:,.2f} initiated "
                f"accompanied by {vel_10m} recent transactions and unfamiliar hardware signals. "
                "Typical of a 'sleeping' or compromised mule account activated for laundering high-volume illicit proceeds."
            ),
            "bank_action_protocol": PROTOCOLS["AML_ESCALATION"],
            "matched_rules": [
                f"extreme_amount_deviation (₹{amount:,.2f} >= ₹1,00,000)",
                "dormant_spike_indicator",
            ],
        }

    # 4. Geographic Location Anomaly / Remote POS/ATM Cloning (Pattern 36)
    # Characteristics: Distance > 300 km (e.g. 500-2000 km) with unrecognized device
    if distance >= 300.0 and new_device:
        return {
            "pattern_id": "P36",
            "pattern_name": "Geographic Anomaly / Remote Point-of-Sale Cloning",
            "threat_category": "CARD_CLONING_REMOTE_COMPROMISE",
            "attack_vector_summary": (
                f"Transaction initiated {distance:,.1f} km away from cardholder's last confirmed physical swipe/login "
                f"using an unrecognized terminal or device. "
                "Indicates physical card cloning (skimming) or token replay from another geographical jurisdiction."
            ),
            "bank_action_protocol": PROTOCOLS["STEP_UP_AUTH"] if fraud_score <= 0.70 else PROTOCOLS["HARD_BLOCK"],
            "matched_rules": [
                f"geographical_deviation ({distance:,.1f} km > 300 km)",
                "unrecognized_device_terminal",
            ],
        }

    # 5. Round Amount Repetition / Structuring (Pattern 21 & Pattern 101)
    # Characteristics: Exact round amount (e.g. 10k, 25k, 50k) with multiple transfers
    if amount in (10_000.0, 20_000.0, 25_000.0, 50_000.0, 100_000.0) and vel_10m >= 2:
        return {
            "pattern_id": "P21_P101",
            "pattern_name": "Round Amount Repetition / Fan Structuring",
            "threat_category": "STRUCTURING_REPETITIVE_TRANSFER",
            "attack_vector_summary": (
                f"Repeated identical round amount transfer of ₹{amount:,.2f} observed {vel_10m} times in short succession. "
                "Matches structuring patterns used to disperse illicit proceeds into round tranches across multiple beneficiaries."
            ),
            "bank_action_protocol": PROTOCOLS["STEP_UP_AUTH"],
            "matched_rules": [
                f"round_value_clustering (₹{amount:,.2f})",
                f"short_window_repetition ({vel_10m} occurrences)",
            ],
        }

    # 6. Default Fallback for General Suspicious Activity
    return {
        "pattern_id": "P_COMPOSITE",
        "pattern_name": "Composite Multi-Factor Fraud Indicator",
        "threat_category": "SUSPICIOUS_UNUSUAL_ACTIVITY",
        "attack_vector_summary": (
            f"Composite risk evaluation flagged unusual telemetry: amount ₹{amount:,.2f}, "
            f"{vel_10m} txns in 10m, {distance:,.1f} km distance, new device flag = {new_device}. "
            "Combined risk factors exceed operational risk tolerance thresholds."
        ),
        "bank_action_protocol": PROTOCOLS["STEP_UP_AUTH"] if fraud_score <= 0.70 else PROTOCOLS["HARD_BLOCK"],
        "matched_rules": ["multi_factor_risk_elevation"],
    }
