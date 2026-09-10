"""Standalone Inference & Decisioning Engine for Real-Time Banking Fraud Detection.

This module provides:
1. Low-latency Booster model loading from persisted artifacts.
2. Input feature schema validation and type coercion.
3. Microsecond-level scoring and multi-tier decisioning:
     - 'ALLOW': score < 0.30
     - 'MFA':   0.30 <= score <= 0.70
     - 'BLOCK': score > 0.70
4. Tree SHAP / feature contribution extraction for interpretable top risk factors.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import lightgbm as lgb
import numpy as np

try:
    from .pattern_matcher import match_fraud_pattern
except (ImportError, ValueError):
    from pattern_matcher import match_fraud_pattern

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("fraud_predictor")

# Model Artifact Locations
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_FILE = ARTIFACTS_DIR / "fraud_model.txt"
SCHEMA_FILE = ARTIFACTS_DIR / "features.json"

FEATURE_ORDER: list[str] = [
    "amount",
    "velocity_10m",
    "velocity_24h",
    "distance_from_last_km",
    "is_new_device",
]

# Risk Factor Explanation Templates
FEATURE_EXPLANATIONS = {
    "amount": "Elevated transaction dollar amount",
    "velocity_10m": "Rapid burst of transactions in past 10 minutes",
    "velocity_24h": "High aggregate transaction frequency in past 24 hours",
    "distance_from_last_km": "Abnormal geographical distance from previous transaction",
    "is_new_device": "Transaction initiated from an unrecognized or new device",
}


class FraudModelService:
    """Singleton service managing model state and thread-safe inference."""

    _instance: FraudModelService | None = None

    def __init__(self, model_path: Path = MODEL_FILE, schema_path: Path = SCHEMA_FILE):
        self.model_path = model_path
        self.schema_path = schema_path
        self.booster: lgb.Booster | None = None
        self.feature_names: list[str] = FEATURE_ORDER
        self._load_model()

    @classmethod
    def get_instance(cls) -> FraudModelService:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_model(self) -> None:
        if not self.model_path.is_file():
            logger.warning(
                "Model artifact not found at '%s'. Call train.py to produce fraud_model.txt.",
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
_service = FraudModelService.get_instance()


def validate_features(features: dict[str, Any]) -> tuple[np.ndarray, dict[str, Any]]:
    """Validates raw transaction payload and formats it for inference.

    Args:
        features: Dictionary containing transaction features.

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
        amount = float(features["amount"])
        velocity_10m = int(features["velocity_10m"])
        velocity_24h = int(features["velocity_24h"])
        distance_km = float(features["distance_from_last_km"])

        # Handle boolean or numeric device flag
        raw_device = features["is_new_device"]
        if isinstance(raw_device, bool):
            is_new_device = 1 if raw_device else 0
        else:
            is_new_device = 1 if int(raw_device) > 0 else 0
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid feature data type encountered: {exc}") from exc

    # Sanity bounds validation
    if amount < 0:
        raise ValueError(f"'amount' cannot be negative. Received: {amount}")
    if velocity_10m < 0:
        raise ValueError(f"'velocity_10m' cannot be negative. Received: {velocity_10m}")
    if velocity_24h < 0:
        raise ValueError(f"'velocity_24h' cannot be negative. Received: {velocity_24h}")
    if distance_km < 0:
        raise ValueError(f"'distance_from_last_km' cannot be negative. Received: {distance_km}")

    sanitized = {
        "amount": round(amount, 2),
        "velocity_10m": velocity_10m,
        "velocity_24h": velocity_24h,
        "distance_from_last_km": round(distance_km, 2),
        "is_new_device": is_new_device,
    }

    feature_vector = np.array(
        [[
            sanitized["amount"],
            sanitized["velocity_10m"],
            sanitized["velocity_24h"],
            sanitized["distance_from_last_km"],
            sanitized["is_new_device"],
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
    # pred_contrib=True returns raw margin contributions for each feature + baseline bias term
    contributions = booster.predict(feature_vector, pred_contrib=True)[0]
    feature_contribs = contributions[:-1]  # Exclude last element (bias)

    # Pair features with their SHAP impact values
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

    # Filter to factors that positively elevated the risk, or top items if all negative
    positive_factors = [f for f in scored_factors if f["impact_score"] > 0]
    return positive_factors[:top_k] if positive_factors else scored_factors[:1]


def score_transaction(features: dict[str, Any]) -> dict[str, Any]:
    """Scores a banking transaction, checks policy thresholds, and provides risk explanations.

    Decision Matrix:
        - 'ALLOW': score < 0.30 (low risk, frictionless pass)
        - 'MFA':   0.30 <= score <= 0.70 (medium risk, step-up challenge required)
        - 'BLOCK': score > 0.70 (high risk, automated transaction halt)

    Args:
        features: Dictionary containing transaction features:
                  ['amount', 'velocity_10m', 'velocity_24h', 'distance_from_last_km', 'is_new_device']

    Returns:
        Dictionary with fraud_score, decision, risk_level, top_risk_factors, and inputs.
    """
    service = FraudModelService.get_instance()
    if not service.is_ready():
        # Attempt reload in case training just finished
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

    print("\n" + "=" * 80)
    print("      REAL-TIME BANKING FRAUD DETECTION - REAL-WORLD SCENARIO TEST SUITE       ")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # Scenario 1: Daily Commuter Morning Metro & Coffee (Baseline)
    # Story: User taps UPI/Debit for ₹350 at 8:15 AM at their regular metro station.
    # Device is their registered phone; low velocity; zero historical anomalies.
    # -------------------------------------------------------------------------
    scenario_1 = {
        "title": "SCENARIO 1: Daily Commuter Morning Metro & Coffee (Genuine Everyday Spending)",
        "story": (
            "Customer uses their regular registered smartphone to purchase coffee and a metro ticket "
            "for ₹350.00 near their home residence at 8:15 AM on a Monday morning."
        ),
        "payload": {
            "amount": 350.00,
            "velocity_10m": 0,
            "velocity_24h": 2,
            "distance_from_last_km": 2.5,
            "is_new_device": 0,
        },
    }

    # -------------------------------------------------------------------------
    # Scenario 2: Dark Web Card-Testing Botnet (Pattern 102)
    # Story: Automated bot script uses an emulator to test batches of compromised BINs
    # with rapid micro-charges of ₹49.00 to see which cards are active without alerting user.
    # -------------------------------------------------------------------------
    scenario_2 = {
        "title": "SCENARIO 2: Dark Web Card-Testing Bot Attack (Pattern 102: Micro-Transaction Burst)",
        "story": (
            "An automated adversary attempts a rapid burst of ₹49.00 micro-transactions (7 attempts in 10 mins) "
            "from a newly registered cloud emulator. Attackers use sub-₹100 transactions to test validity "
            "of leaked card numbers without triggering standard high-value customer SMS notifications."
        ),
        "payload": {
            "amount": 49.00,
            "velocity_10m": 7,
            "velocity_24h": 16,
            "distance_from_last_km": 15.0,
            "is_new_device": 1,
        },
    }

    # -------------------------------------------------------------------------
    # Scenario 3: Stolen UPI PIN / Account Takeover Fast Drain (Pattern 1 & 27)
    # Story: Fraudster phishes victim's credentials, logs in from a new device,
    # and rapidly initiates rapid back-to-back fund transfers totaling ₹95,000 in 10 minutes.
    # -------------------------------------------------------------------------
    scenario_3 = {
        "title": "SCENARIO 3: Stolen UPI Credentials & Account Takeover (Pattern 1 & 27: Rapid Transfer Burst)",
        "story": (
            "Victim clicked a phishing SMS 30 minutes ago. The attacker logs in from an unrecognized phone "
            "and immediately triggers an 8-transaction burst within 10 minutes, rapidly sending ₹95,000.00 "
            "to intermediary mule accounts before the victim can contact bank support."
        ),
        "payload": {
            "amount": 95000.00,
            "velocity_10m": 8,
            "velocity_24h": 25,
            "distance_from_last_km": 12.0,
            "is_new_device": 1,
        },
    }

    # -------------------------------------------------------------------------
    # Scenario 4: Dormant Student Account Money Mule Surge (Pattern 15 & 24)
    # Story: A student bank account with ₹500 balance dormant for 6 months suddenly
    # receives illicit proceeds and initiates a ₹5,00,000 transfer to an unknown recipient.
    # -------------------------------------------------------------------------
    scenario_4 = {
        "title": "SCENARIO 4: Dormant Account Money Mule Activation (Pattern 15 & 24: Amount Surge Anomaly)",
        "story": (
            "A college student's savings account was dormant for 6 months with minimal ₹500 activity. "
            "Suddenly, an unusual incoming influx occurs and the account attempts an immediate outbound transfer "
            "of ₹5,00,000.00 accompanied by sudden high velocity and an unrecognized device."
        ),
        "payload": {
            "amount": 500000.00,
            "velocity_10m": 4,
            "velocity_24h": 12,
            "distance_from_last_km": 45.0,
            "is_new_device": 1,
        },
    }

    # -------------------------------------------------------------------------
    # Scenario 5: Cloned Physical Debit Card Remote ATM Swipe (Pattern 36)
    # Story: Customer swiped card in Delhi 25 minutes ago. Suddenly, an attacker
    # performs a balance check and an immediate ATM withdrawal of ₹4,500 1,850 km away in Mumbai.
    # -------------------------------------------------------------------------
    scenario_5 = {
        "title": "SCENARIO 5: Cloned Card Remote Terminal Swipe (Pattern 36: Geographic Anomaly)",
        "story": (
            "Cardholder physically tapped their card at a supermarket in Delhi 25 minutes ago. "
            "Now, an attacker attempts a balance check followed by an immediate ATM withdrawal of ₹4,500.00 "
            "(2 transactions within 10 mins) 1,850 km away in Mumbai from an unfamiliar terminal. "
            "Physical travel between these two points in 25 minutes is physically impossible (Impossible Travel)."
        ),
        "payload": {
            "amount": 4500.00,
            "velocity_10m": 2,
            "velocity_24h": 5,
            "distance_from_last_km": 1850.0,
            "is_new_device": 1,
        },
    }

    # -------------------------------------------------------------------------
    # Scenario 6: High-Value Genuine Laptop Purchase (Salary Day)
    # Story: Customer buys a ₹78,000 laptop on their recognized home laptop.
    # Amount is high, but pacing is normal, device is trusted, and distance is local.
    # -------------------------------------------------------------------------
    scenario_6 = {
        "title": "SCENARIO 6: High-Value Genuine Laptop Purchase on Trusted Device (Salary Day)",
        "story": (
            "Customer purchases a high-end work laptop for ₹78,000.00 on salary day from an authorized retailer. "
            "The transaction is initiated from their recognized home laptop (known device), local distance (3.2 km), "
            "with zero preceding velocity spikes."
        ),
        "payload": {
            "amount": 78000.00,
            "velocity_10m": 0,
            "velocity_24h": 1,
            "distance_from_last_km": 3.2,
            "is_new_device": 0,
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

        # Color-coded badge representation
        badge = f"[ {decision} - {risk_level} RISK (Score: {score * 100:.1f}%) ]"
        print(f"Model Decision  : {badge}")
        print(f"Detected Pattern: {pat['pattern_id']} -> {pat['pattern_name']}")
        print(f"Threat Analysis : {pat['attack_vector_summary']}")
        print("Top Risk Factors (Tree SHAP):")
        for factor in res["top_risk_factors"]:
            sign = "+" if factor["impact_score"] >= 0 else ""
            print(f"  * {factor['feature']:<22}: {factor['value']} ({sign}{factor['impact_score']:.4f} impact) -> {factor['description']}")
        print(f"Bank Protocol   : {pat['bank_action_protocol']}")
        print("-" * 80)


