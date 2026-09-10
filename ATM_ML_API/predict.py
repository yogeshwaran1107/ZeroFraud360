"""Standalone Inference & Decisioning Engine for Real-Time ATM & Cash Withdrawal Fraud Detection.

This module provides:
1. Low-latency Booster model loading from persisted artifacts.
2. Input feature schema validation and type coercion.
3. Microsecond-level scoring and multi-tier decisioning:
     - 'ALLOW': score < 0.30
     - 'MFA':   0.30 <= score <= 0.70
     - 'BLOCK': score > 0.70
4. Tree SHAP / feature contribution extraction for interpretable top risk factors.
5. Domain pattern matching for ATM & cash-out attack vectors (incorporating
   withdrawal methods from 'withdrawal methods.docx' and patterns from 'updated dataset-1.0.docx').
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import lightgbm as lgb
import numpy as np

from pattern_matcher import match_fraud_pattern

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("atm_fraud_predictor")

# Model Artifact Locations
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_FILE = ARTIFACTS_DIR / "atm_fraud_model.txt"
SCHEMA_FILE = ARTIFACTS_DIR / "features.json"

FEATURE_ORDER: list[str] = [
    "withdrawal_amount",
    "channel_deviation_score",
    "velocity_10m",
    "velocity_24h",
    "distance_from_last_terminal_km",
    "is_off_hours",
    "failed_auth_attempts",
    "amount_to_avg_ratio",
]

# Risk Factor Explanation Templates
FEATURE_EXPLANATIONS = {
    "withdrawal_amount": "Substantially elevated cash withdrawal amount",
    "channel_deviation_score": "Severe deviation from customer's historical withdrawal channel preferences",
    "velocity_10m": "Rapid burst of cash withdrawals in past 10 minutes",
    "velocity_24h": "High aggregate withdrawal attempts within past 24 hours",
    "distance_from_last_terminal_km": "Abnormal geographical distance from preceding terminal (impossible travel)",
    "is_off_hours": "Withdrawal executed during nocturnal off-hours window (23:00 - 05:00)",
    "failed_auth_attempts": "Repeated prior failed PIN or biometric authentication challenges",
    "amount_to_avg_ratio": "Withdrawal amount significantly exceeds account historical average",
}


class ATMModelService:
    """Singleton service managing model state and thread-safe inference."""

    _instance: ATMModelService | None = None

    def __init__(self, model_path: Path = MODEL_FILE, schema_path: Path = SCHEMA_FILE):
        self.model_path = model_path
        self.schema_path = schema_path
        self.booster: lgb.Booster | None = None
        self.feature_names: list[str] = FEATURE_ORDER
        self._load_model()

    @classmethod
    def get_instance(cls) -> ATMModelService:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_model(self) -> None:
        if not self.model_path.is_file():
            logger.warning(
                "Model artifact not found at '%s'. Call train.py to produce atm_fraud_model.txt.",
                self.model_path,
            )
            return

        logger.info("Loading production LightGBM booster from: %s", self.model_path)
        self.booster = lgb.Booster(model_file=str(self.model_path))

        if self.schema_path.is_file():
            try:
                with open(self.schema_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                    self.feature_names = meta.get("features", FEATURE_ORDER)
            except Exception as e:
                logger.warning("Could not read feature schema: %s. Using default.", e)

    def is_ready(self) -> bool:
        return self.booster is not None


# Global singleton instance loaded at module import time
_service = ATMModelService.get_instance()


def validate_features(features: dict[str, Any]) -> tuple[np.ndarray, dict[str, Any]]:
    """Validates raw withdrawal payload and formats it for inference.

    Args:
        features: Dictionary containing withdrawal features.

    Returns:
        A tuple of (2D numpy feature array, sanitized feature dictionary).

    Raises:
        ValueError: If required features are missing or contain negative / invalid values.
    """
    if not isinstance(features, dict):
        raise ValueError(f"Input features must be a dictionary, got {type(features).__name__}")

    missing_fields = [f for f in FEATURE_ORDER if f not in features]
    if missing_fields:
        raise ValueError(
            f"Missing required transaction features: {missing_fields}. "
            f"Expected features: {FEATURE_ORDER}"
        )

    try:
        amount = float(features["withdrawal_amount"])
        channel_dev = float(features["channel_deviation_score"])
        velocity_10m = int(features["velocity_10m"])
        velocity_24h = int(features["velocity_24h"])
        distance_km = float(features["distance_from_last_terminal_km"])
        is_off_hours = int(1 if features["is_off_hours"] else 0)
        failed_auth = int(features["failed_auth_attempts"])
        amt_ratio = float(features["amount_to_avg_ratio"])
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid feature data type encountered: {exc}") from exc

    # Sanity bounds validation
    if amount < 0:
        raise ValueError(f"'withdrawal_amount' cannot be negative. Received: {amount}")
    if channel_dev < 0.0 or channel_dev > 1.0:
        raise ValueError(f"'channel_deviation_score' must be between 0.0 and 1.0. Received: {channel_dev}")
    if velocity_10m < 0:
        raise ValueError(f"'velocity_10m' cannot be negative. Received: {velocity_10m}")
    if velocity_24h < 0:
        raise ValueError(f"'velocity_24h' cannot be negative. Received: {velocity_24h}")
    if distance_km < 0:
        raise ValueError(f"'distance_from_last_terminal_km' cannot be negative. Received: {distance_km}")
    if failed_auth < 0:
        raise ValueError(f"'failed_auth_attempts' cannot be negative. Received: {failed_auth}")
    if amt_ratio < 0:
        raise ValueError(f"'amount_to_avg_ratio' cannot be negative. Received: {amt_ratio}")

    sanitized = {
        "withdrawal_amount": round(amount, 2),
        "channel_deviation_score": round(channel_dev, 4),
        "velocity_10m": velocity_10m,
        "velocity_24h": velocity_24h,
        "distance_from_last_terminal_km": round(distance_km, 2),
        "is_off_hours": is_off_hours,
        "failed_auth_attempts": failed_auth,
        "amount_to_avg_ratio": round(amt_ratio, 2),
    }

    feature_vector = np.array(
        [[
            sanitized["withdrawal_amount"],
            sanitized["channel_deviation_score"],
            sanitized["velocity_10m"],
            sanitized["velocity_24h"],
            sanitized["distance_from_last_terminal_km"],
            sanitized["is_off_hours"],
            sanitized["failed_auth_attempts"],
            sanitized["amount_to_avg_ratio"],
        ]],
        dtype=np.float64,
    )

    return feature_vector, sanitized


def extract_top_risk_factors(
    booster: lgb.Booster,
    feature_vector: np.ndarray,
    sanitized_features: dict[str, Any],
    top_k: int = 3,
) -> list[dict[str, Any]]:
    """Calculates feature contributions (Tree SHAP values) to explain decisioning.

    Args:
        booster: Trained LightGBM Booster instance.
        feature_vector: 1xN numpy array of feature values.
        sanitized_features: Key-value dictionary of the inputs.
        top_k: Maximum number of top risk factors to return.

    Returns:
        List of structured risk factor explanations sorted by positive impact.
    """
    contributions = booster.predict(feature_vector, pred_contrib=True)[0]
    feature_contribs = contributions[:-1]

    scored_factors = []
    for feat_name, impact in zip(FEATURE_ORDER, feature_contribs):
        scored_factors.append(
            {
                "feature": feat_name,
                "value": sanitized_features[feat_name],
                "impact_score": round(float(impact), 4),
                "description": FEATURE_EXPLANATIONS.get(feat_name, "Elevated risk indicator"),
            }
        )

    # Sort descending by contribution to fraud risk
    scored_factors.sort(key=lambda x: x["impact_score"], reverse=True)

    positive_factors = [f for f in scored_factors if f["impact_score"] > 0]
    return positive_factors[:top_k] if positive_factors else scored_factors[:1]


def score_transaction(features: dict[str, Any]) -> dict[str, Any]:
    """Scores an ATM/cash withdrawal, evaluates policy thresholds, and provides risk explanations.

    Decision Matrix:
        - 'ALLOW': score < 0.30 (low risk, frictionless dispense)
        - 'MFA':   0.30 <= score <= 0.70 (medium risk, OTP / step-up challenge required)
        - 'BLOCK': score > 0.70 (high risk, automated dispense abort & card freeze)

    Args:
        features: Dictionary containing transaction features.

    Returns:
        Dictionary with fraud_score, decision, risk_level, top_risk_factors, and inputs.
    """
    service = ATMModelService.get_instance()
    if not service.is_ready():
        service._load_model()
        if not service.is_ready():
            raise RuntimeError(
                f"Model booster not found at '{service.model_path}'. "
                f"Please execute 'python train.py' to generate the model artifacts first."
            )

    # 1. Validate and Format Features
    feature_vector, sanitized_features = validate_features(features)

    # 2. Compute Inference Score (0.0 to 1.0)
    raw_score = float(service.booster.predict(feature_vector)[0])
    fraud_score = float(np.clip(raw_score, 0.0, 1.0))

    # 3. Policy Rule Decisioning
    if fraud_score < 0.30:
        decision = "ALLOW"
        risk_level = "LOW"
    elif fraud_score <= 0.70:
        decision = "MFA"
        risk_level = "MEDIUM"
    else:
        decision = "BLOCK"
        risk_level = "HIGH"

    # 4. Extract Top Contributing Risk Factors (SHAP Explanations)
    top_risk_factors = extract_top_risk_factors(
        service.booster,
        feature_vector,
        sanitized_features,
        top_k=3,
    )

    # 5. Fraud Pattern Matching & Operational Protocol
    pattern_detection = match_fraud_pattern(
        sanitized_features,
        fraud_score,
        top_shap_factors=top_risk_factors,
    )

    return {
        "fraud_score": round(fraud_score, 4),
        "decision": decision,
        "risk_level": risk_level,
        "pattern_detection": pattern_detection,
        "top_risk_factors": top_risk_factors,
        "thresholds": {
            "allow_below": 0.30,
            "mfa_between": [0.30, 0.70],
            "block_above": 0.70,
        },
        "evaluated_features": sanitized_features,
    }


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")

    print("\n" + "=" * 85)
    print("     ATM & CASH WITHDRAWAL FRAUD DETECTION - REAL-WORLD SCENARIO TEST SUITE       ")
    print("=" * 85)

    # -------------------------------------------------------------------------
    # Scenario 1: Daily Neighborhood ATM Withdrawal by Arun Kumar (ACC1001)
    # Story: Arun Kumar has a 60% ATM usage preference. He withdraws ₹2,500 at
    # his local neighborhood ATM at 10:30 AM on Sunday. Zero failed attempts.
    # -------------------------------------------------------------------------
    scenario_1 = {
        "title": "SCENARIO 1: Everyday Neighborhood ATM Cash Withdrawal (Baseline Legit - Arun Kumar ACC1001)",
        "story": (
            "Arun Kumar (ACC1001 - baseline 60% ATM user) withdraws ₹2,500.00 cash from his usual neighborhood "
            "bank ATM (1.2 km away) on Sunday morning. Channel usage matches his baseline, zero failed PIN attempts, "
            "and normal transaction pacing."
        ),
        "payload": {
            "withdrawal_amount": 2500.00,
            "channel_deviation_score": 0.02,
            "velocity_10m": 0,
            "velocity_24h": 1,
            "distance_from_last_terminal_km": 1.2,
            "is_off_hours": 0,
            "failed_auth_attempts": 0,
            "amount_to_avg_ratio": 0.95,
        },
    }

    # -------------------------------------------------------------------------
    # Scenario 2: Sudden Channel Takeover: Dinesh Kumar (ACC1004)
    # Story: Dinesh Kumar has 0% historical ATM usage (65% Branch, 35% Post Office AePS).
    # A stolen card/credentials initiates a sudden ₹35,000 ATM withdrawal at high deviation!
    # -------------------------------------------------------------------------
    scenario_2 = {
        "title": "SCENARIO 2: Sudden Unused Channel Exploitation (Dinesh Kumar ACC1004: 0% Historical ATM Usage)",
        "story": (
            "Dinesh Kumar's account profile exclusively uses Bank Branch (65%) and Post Office AePS (35%), "
            "with exactly 0% historical ATM usage. Suddenly, an attacker attempts an ATM withdrawal of ₹35,000.00 "
            "(11.5x average) on an unfamiliar ATM terminal with a high channel deviation score of 0.95."
        ),
        "payload": {
            "withdrawal_amount": 35000.00,
            "channel_deviation_score": 0.95,
            "velocity_10m": 2,
            "velocity_24h": 5,
            "distance_from_last_terminal_km": 42.0,
            "is_off_hours": 0,
            "failed_auth_attempts": 1,
            "amount_to_avg_ratio": 11.5,
        },
    }

    # -------------------------------------------------------------------------
    # Scenario 3: Cloned Debit Card Terminal Impossible Travel (Pattern 36)
    # Story: Customer swiped ATM card in Delhi 20 mins ago. Suddenly an ATM
    # withdrawal of ₹20,000 is attempted 1,450 km away in Mumbai.
    # -------------------------------------------------------------------------
    scenario_3 = {
        "title": "SCENARIO 3: Remote Terminal Impossible Travel / Cloned Card (Pattern 36)",
        "story": (
            "Customer used their card in Delhi 20 minutes ago. A cloned debit card clone is swiped at an ATM terminal "
            "in Mumbai 1,450 km away for ₹20,000.00 cash. Physical transit between terminals in 20 mins is impossible."
        ),
        "payload": {
            "withdrawal_amount": 20000.00,
            "channel_deviation_score": 0.35,
            "velocity_10m": 1,
            "velocity_24h": 4,
            "distance_from_last_terminal_km": 1450.0,
            "is_off_hours": 0,
            "failed_auth_attempts": 0,
            "amount_to_avg_ratio": 5.5,
        },
    }

    # -------------------------------------------------------------------------
    # Scenario 4: Cash-Out Burst / Rapid ATM Draining (Pattern 39/40)
    # Story: Attacker performs 4 rapid back-to-back maximum withdrawals of ₹10,000
    # within 8 minutes, attempting to drain the account before detection.
    # -------------------------------------------------------------------------
    scenario_4 = {
        "title": "SCENARIO 4: Rapid Cash-Out Burst / Account Draining (Pattern 39/40)",
        "story": (
            "Attacker executes a rapid barrage of 4 consecutive maximum ATM withdrawals totaling ₹40,000.00 "
            "within 8 minutes (velocity_10m = 4) to drain the daily switch dispensing limit before the cardholder notices."
        ),
        "payload": {
            "withdrawal_amount": 40000.00,
            "channel_deviation_score": 0.45,
            "velocity_10m": 4,
            "velocity_24h": 9,
            "distance_from_last_terminal_km": 18.0,
            "is_off_hours": 0,
            "failed_auth_attempts": 0,
            "amount_to_avg_ratio": 8.5,
        },
    }

    # -------------------------------------------------------------------------
    # Scenario 5: Nocturnal ATM Cash-Out with PIN Brute-Force Failures
    # Story: Physical card theft. Attacker at 2:45 AM tries multiple guessed PINs
    # before successfully attempting a ₹25,000 withdrawal.
    # -------------------------------------------------------------------------
    scenario_5 = {
        "title": "SCENARIO 5: Nocturnal ATM Cash-Out with Prior PIN Failures (Stolen Card Brute Force)",
        "story": (
            "At 2:45 AM (off-hours window), an attacker attempts a ₹25,000.00 cash withdrawal at a standalone "
            "unattended ATM kiosk following 3 consecutive failed PIN attempts."
        ),
        "payload": {
            "withdrawal_amount": 25000.00,
            "channel_deviation_score": 0.35,
            "velocity_10m": 2,
            "velocity_24h": 6,
            "distance_from_last_terminal_km": 25.0,
            "is_off_hours": 1,
            "failed_auth_attempts": 3,
            "amount_to_avg_ratio": 7.0,
        },
    }

    # -------------------------------------------------------------------------
    # Scenario 6: High-Value Genuine Bank Branch Cashier Withdrawal
    # Story: Customer withdraws ₹15,000 over the counter at their local home branch
    # during regular hours with full teller identity verification.
    # -------------------------------------------------------------------------
    scenario_6 = {
        "title": "SCENARIO 6: High-Value Genuine Bank Branch Cashier Withdrawal (Normal Baseline)",
        "story": (
            "Customer withdraws ₹15,000.00 over the counter at their home bank branch during normal banking hours "
            "for household festival expenses. Local distance (0.8 km), zero failed auth, aligned with branch profile."
        ),
        "payload": {
            "withdrawal_amount": 15000.00,
            "channel_deviation_score": 0.03,
            "velocity_10m": 0,
            "velocity_24h": 1,
            "distance_from_last_terminal_km": 0.8,
            "is_off_hours": 0,
            "failed_auth_attempts": 0,
            "amount_to_avg_ratio": 1.4,
        },
    }

    test_scenarios = [
        scenario_1,
        scenario_2,
        scenario_3,
        scenario_4,
        scenario_5,
        scenario_6,
    ]

    for idx, sc in enumerate(test_scenarios, 1):
        print(f"\n[{idx}/6] {sc['title']}")
        print(f"Incident Context: {sc['story']}")
        print(f"Input Telemetry : {sc['payload']}")

        res = score_transaction(sc["payload"])
        score = res["fraud_score"]
        decision = res["decision"]
        risk_level = res["risk_level"]
        pat = res["pattern_detection"]

        badge = f"[ {decision} - {risk_level} RISK (Score: {score * 100:.1f}%) ]"
        print(f"Model Decision  : {badge}")
        print(f"Detected Pattern: {pat['pattern_id']} -> {pat['pattern_name']}")
        print(f"Threat Analysis : {pat['attack_vector_summary']}")
        print("Top Risk Factors (Tree SHAP):")
        for factor in res["top_risk_factors"]:
            sign = "+" if factor["impact_score"] >= 0 else ""
            print(f"  * {factor['feature']:<30}: {factor['value']} ({sign}{factor['impact_score']:.4f} impact) -> {factor['description']}")
        print(f"Bank Protocol   : {pat['bank_action_protocol']}")
        print("-" * 85)
