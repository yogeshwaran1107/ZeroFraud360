"""Comprehensive Verification & Evaluation Suite for PATTERN_ML_API under New Operational Criteria."""

import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.stdout.reconfigure(encoding="utf-8")

try:
    from .predict import score_transaction
except (ImportError, ValueError):
    from predict import score_transaction

print("=" * 85)
print("     EVALUATING MODEL 1: PATTERN_ML_API (Digital Banking & Transfer Fraud Model)     ")
print("=" * 85)

test_cases = [
    {
        "case_id": "PATTERN_CASE_1",
        "category": "BENIGN / ALLOW",
        "name": "Everyday UPI Grocery Payment on Registered Smartphone",
        "description": "Customer buys groceries for ₹850 via UPI on their primary registered phone. Zero velocity spikes, local distance (1.2 km).",
        "payload": {
            "amount": 850.00,
            "velocity_10m": 0,
            "velocity_24h": 1,
            "distance_from_last_km": 1.2,
            "is_new_device": 0,
        },
    },
    {
        "case_id": "PATTERN_CASE_2",
        "category": "STEP-UP / MFA",
        "name": "New Device Moderate P2P Transfer Burst (Step-Up Authentication)",
        "description": "User sets up mobile banking on a newly purchased tablet and sends ₹10,000 to a friend with 2 quick transactions in 10 minutes.",
        "payload": {
            "amount": 10000.00,
            "velocity_10m": 2,
            "velocity_24h": 3,
            "distance_from_last_km": 60.0,
            "is_new_device": 1,
        },
    },
    {
        "case_id": "PATTERN_CASE_3",
        "category": "HARD BLOCK",
        "name": "High-Frequency Automated Bot Testing Burst (Card-Testing Botnet)",
        "description": "Adversary emulator triggers a rapid barrage of 6 micro-transfers of ₹8,500 within 10 mins (19 txns in 24h) to test compromised account limits.",
        "payload": {
            "amount": 8500.00,
            "velocity_10m": 6,
            "velocity_24h": 19,
            "distance_from_last_km": 8.0,
            "is_new_device": 1,
        },
    },
    {
        "case_id": "PATTERN_CASE_4",
        "category": "HARD BLOCK",
        "name": "High-Value Phished Account Takeover Rapid Siphon",
        "description": "Compromised net-banking account accessed from a rogue IP/device initiates an immediate ₹75,000 outbound transfer with 4 burst transfers.",
        "payload": {
            "amount": 75000.00,
            "velocity_10m": 4,
            "velocity_24h": 12,
            "distance_from_last_km": 120.0,
            "is_new_device": 1,
        },
    },
]

for idx, tc in enumerate(test_cases, 1):
    print(f"\n[{idx}/4] [{tc['category']}] {tc['case_id']}: {tc['name']}")
    print(f"Scenario  : {tc['description']}")
    print(f"Inputs    : {tc['payload']}")

    result = score_transaction(tc["payload"])
    score = result["fraud_score"]
    decision = result["decision"]
    risk = result["risk_level"]
    pattern = result["pattern_detection"]

    badge = f"[ {decision} - {risk} RISK (Fraud Score: {score * 100:.2f}%) ]"
    print(f"Result    : {badge}")
    print(f"Pattern   : {pattern['pattern_id']} -> {pattern['pattern_name']}")
    print(f"Threat    : {pattern['attack_vector_summary']}")
    print("Tree SHAP Risk Drivers:")
    for f in result["top_risk_factors"]:
        sign = "+" if f["impact_score"] >= 0 else ""
        print(f"  * {f['feature']:<22}: {f['value']} ({sign}{f['impact_score']:.4f} impact) -> {f['description']}")
    print(f"Protocol  : {pattern['bank_action_protocol']}")
    print("-" * 85)
