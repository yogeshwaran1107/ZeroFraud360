"""Comprehensive Verification & Evaluation Suite for ATM_ML_API under New Operational Criteria."""

import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.stdout.reconfigure(encoding="utf-8")

from predict import score_transaction

print("=" * 85)
print("     EVALUATING MODEL 2: ATM_ML_API (ATM & Cash Withdrawal Fraud Model)          ")
print("=" * 85)

test_cases = [
    {
        "case_id": "ATM_CASE_1",
        "category": "BENIGN / ALLOW",
        "name": "Standard Daytime ATM Cash Withdrawal (Karthik Raj ACC1003: 55% ATM User)",
        "description": "Karthik Raj withdraws ₹3,000 cash from his usual neighborhood ATM (1.8 km away) at 11:15 AM on a Wednesday. Channel matches his 55% ATM baseline, zero failed attempts, nominal pacing.",
        "payload": {
            "withdrawal_amount": 3000.00,
            "channel_deviation_score": 0.02,
            "velocity_10m": 0,
            "velocity_24h": 1,
            "distance_from_last_terminal_km": 1.8,
            "is_off_hours": 0,
            "failed_auth_attempts": 0,
            "amount_to_avg_ratio": 0.98,
        },
    },
    {
        "case_id": "ATM_CASE_2",
        "category": "HARD BLOCK",
        "name": "Sudden Rural BC/CSP Micro-ATM Biometric Takeover (Dinesh Kumar ACC1004)",
        "description": "Dinesh Kumar's profile has 0% BC/CSP AePS history (65% Branch, 35% Post Office). A rogue Business Correspondent processes a ₹22,000 cash withdrawal (7.5x average) with 2 fingerprint retry errors.",
        "payload": {
            "withdrawal_amount": 22000.00,
            "channel_deviation_score": 0.92,
            "velocity_10m": 2,
            "velocity_24h": 4,
            "distance_from_last_terminal_km": 65.0,
            "is_off_hours": 0,
            "failed_auth_attempts": 2,
            "amount_to_avg_ratio": 7.5,
        },
    },
    {
        "case_id": "ATM_CASE_3",
        "category": "HARD BLOCK",
        "name": "Late-Night Highway ATM Velocity Draining (Pattern 39/40 Cash-Out Burst)",
        "description": "Physical card theft. Attacker executes 3 back-to-back maximal cash-outs of ₹10,000 (total ₹30,000) at 3:15 AM (off-hours) from a distant highway ATM following 1 failed PIN attempt.",
        "payload": {
            "withdrawal_amount": 30000.00,
            "channel_deviation_score": 0.40,
            "velocity_10m": 3,
            "velocity_24h": 7,
            "distance_from_last_terminal_km": 85.0,
            "is_off_hours": 1,
            "failed_auth_attempts": 1,
            "amount_to_avg_ratio": 9.5,
        },
    },
    {
        "case_id": "ATM_CASE_4",
        "category": "BENIGN / ALLOW",
        "name": "Senior Citizen Monthly Pension Counter Withdrawal (Santhosh Kumar ACC1010)",
        "description": "Santhosh Kumar withdraws his monthly pension of ₹12,000 over the counter at his home bank branch. Matches his established 30% branch baseline, zero failed auth, local distance (0.5 km).",
        "payload": {
            "withdrawal_amount": 12000.00,
            "channel_deviation_score": 0.04,
            "velocity_10m": 0,
            "velocity_24h": 1,
            "distance_from_last_terminal_km": 0.5,
            "is_off_hours": 0,
            "failed_auth_attempts": 0,
            "amount_to_avg_ratio": 1.2,
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
        print(f"  * {f['feature']:<30}: {f['value']} ({sign}{f['impact_score']:.4f} impact) -> {f['description']}")
    print(f"Protocol  : {pattern['bank_action_protocol']}")
    print("-" * 85)
