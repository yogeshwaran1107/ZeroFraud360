"""Automated Test Suite for ZeroFraud360 Python Decision REST API.

Tests:
1. Health check (/health).
2. User's exact POST /fraud/verify JSON alert format.
3. Plain text response option ("STOP" / "ALLOW") via ?format=text and Accept header.
4. End-to-end payment event sequence triggering RAPID_PASS_THROUGH (A -> B then B -> C within 180s).
5. ATM Cash-Out burst fraud alert verification.

Can run either against a live uvicorn server (http://127.0.0.1:8000) or
in-process via FastAPI's TestClient without needing a separate running server.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import requests

sys.stdout.reconfigure(encoding="utf-8")

# Ensure ROOT_DIR (ML_BRAIN) is in sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

BASE_URL = "http://127.0.0.1:8000"


class ApiClient:
    """Unified client: Uses live server if reachable, falls back to FastAPI TestClient."""

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip("/")
        self.is_live = False

        try:
            r = requests.get(f"{self.base_url}/health", timeout=0.8)
            if r.status_code == 200:
                self.is_live = True
        except Exception:
            self.is_live = False

        if self.is_live:
            print(f"[TEST CLIENT] Connected to LIVE server at {self.base_url}")
            self._test_client = None
        else:
            print(f"[TEST CLIENT] No live server detected. Using fast in-process FastAPI TestClient.")
            from fastapi.testclient import TestClient
            from app import app
            self._test_client = TestClient(app)

    def get(self, path: str, **kwargs):
        clean_path = path if path.startswith("/") else f"/{path}"
        if self.is_live:
            return requests.get(f"{self.base_url}{clean_path}", **kwargs)
        return self._test_client.get(clean_path, **kwargs)

    def post(self, path: str, **kwargs):
        clean_path = path if path.startswith("/") else f"/{path}"
        if self.is_live:
            return requests.post(f"{self.base_url}{clean_path}", **kwargs)
        return self._test_client.post(clean_path, **kwargs)


client = ApiClient()


def test_health():
    print("\n[TEST 1] Testing GET /health...")
    resp = client.get("/health")
    assert resp.status_code == 200, f"Health check failed: {resp.status_code}"
    data = resp.json()
    print("Health Status:", json.dumps(data, indent=2))
    assert data["status"] == "HEALTHY"


def test_user_exact_fraud_verify_json():
    print("\n[TEST 2] Testing POST /fraud/verify with User's exact JSON format...")
    payload = {
        "requestId": "DEC-ALERT-123",
        "alertId": "ALERT-123",
        "patternType": "RAPID_PASS_THROUGH",
        "firstTransaction": {
            "transactionId": "TXN-1001",
            "senderAccountId": "ACC-1",
            "receiverAccountId": "ACC-2",
            "amount": 10000.00,
            "currency": "INR",
            "occurredAt": "2026-09-10T06:30:00Z",
        },
        "secondTransaction": {
            "transactionId": "TXN-1002",
            "senderAccountId": "ACC-2",
            "receiverAccountId": "ACC-3",
            "amount": 10000.00,
            "currency": "INR",
            "occurredAt": "2026-09-10T06:31:00Z",
        },
        "timeDifferenceSeconds": 60,
        "message": "Rapid pass-through detected between ACC-1 -> ACC-2 -> ACC-3 within 60s",
    }

    resp = client.post("/fraud/verify", json=payload)
    assert resp.status_code == 200, f"Request failed: {resp.status_code}, {resp.text}"
    data = resp.json()
    print("Response JSON:")
    print(json.dumps(data, indent=2))

    assert data["requestId"] == "DEC-ALERT-123"
    assert data["decision"] == "STOP", f"Expected STOP, got {data['decision']}"
    print(" Verified: Decision is STOP (creates fund hold as requested).")


def test_user_plain_text_response():
    print("\n[TEST 3] Testing POST /fraud/verify for Plain Text response (Accept: text/plain or ?format=text)...")
    payload = {
        "requestId": "DEC-ALERT-123",
        "alertId": "ALERT-123",
        "patternType": "RAPID_PASS_THROUGH",
        "timeDifferenceSeconds": 60,
        "secondTransaction": {
            "transactionId": "TXN-1002",
            "senderAccountId": "ACC-2",
            "receiverAccountId": "ACC-3",
            "amount": 10000.00,
            "currency": "INR",
            "occurredAt": "2026-09-10T06:31:00Z",
        },
    }

    # Test via query parameter
    resp1 = client.post("/fraud/verify?format=text", json=payload)
    assert resp1.status_code == 200
    print("Format text response:", repr(resp1.text))
    assert resp1.text.strip() == "STOP"

    # Test via Accept header
    resp2 = client.post("/fraud/verify", json=payload, headers={"Accept": "text/plain"})
    assert resp2.status_code == 200
    print("Accept header response:", repr(resp2.text))
    assert resp2.text.strip() == "STOP"
    print(" Verified: Plain text response matches exactly 'STOP'.")


def test_payment_events_end_to_end_trigger():
    print("\n[TEST 4] Testing End-to-End Payment Event Sequence on POST /internal/v1/events/payment-success...")

    # Event 1: A -> B ₹10,000 at 06:30:00Z
    event_1 = {
        "eventId": "EVT-001",
        "eventType": "PAYMENT_SUCCESS",
        "transactionId": "TXN-1001",
        "occurredAt": "2026-09-10T06:30:00Z",
        "sender": {
            "accountId": "ACC-1",
            "accountNumber": "1000000001",
            "bankId": "BANK_A",
        },
        "receiver": {
            "accountId": "ACC-2",
            "accountNumber": "2000000001",
            "bankId": "BANK_B",
        },
        "amount": 10000.00,
        "currency": "INR",
        "paymentRail": "SIMULATED_UPI",
        "correlationId": "CORR-001",
        "messageId": "MSG-001",
    }

    print("Submitting Event 1 (A -> B)...")
    r1 = client.post("/internal/v1/events/payment-success", json=event_1)
    assert r1.status_code == 200
    data1 = r1.json()
    print("Event 1 Result: Accepted, ruleTriggered =", data1["ruleTriggered"])
    assert data1["ruleTriggered"] is False

    # Event 2: B -> C ₹10,000 at 06:31:00Z (60s later, <= 180s trigger)
    event_2 = {
        "eventId": "EVT-002",
        "eventType": "PAYMENT_SUCCESS",
        "transactionId": "TXN-1002",
        "occurredAt": "2026-09-10T06:31:00Z",
        "sender": {
            "accountId": "ACC-2",
            "accountNumber": "2000000001",
            "bankId": "BANK_B",
        },
        "receiver": {
            "accountId": "ACC-3",
            "accountNumber": "3000000001",
            "bankId": "BANK_C",
        },
        "amount": 10000.00,
        "currency": "INR",
        "paymentRail": "SIMULATED_UPI",
        "correlationId": "CORR-002",
        "messageId": "MSG-002",
    }

    print("Submitting Event 2 (B -> C within 60s)...")
    r2 = client.post("/internal/v1/events/payment-success", json=event_2)
    assert r2.status_code == 200
    data2 = r2.json()
    print("Event 2 Result: ruleTriggered =", data2["ruleTriggered"])
    assert data2["ruleTriggered"] is True
    eval_res = data2["alertEvaluation"]
    print("Triggered Decision:", eval_res["decision"])
    print("Triggered Reason  :", eval_res["reason"])
    assert eval_res["decision"] == "STOP"
    print(" Verified: Sequential events accurately triggered RAPID_PASS_THROUGH and returned STOP.")


def test_atm_fraud_alert():
    print("\n[TEST 5] Testing POST /fraud/verify with ATM Cash-Out Burst pattern...")
    payload = {
        "requestId": "DEC-ATM-999",
        "alertId": "ALERT-ATM-999",
        "patternType": "ATM_CASH_OUT_BURST",
        "firstTransaction": {
            "transactionId": "TXN-ATM-01",
            "senderAccountId": "ACC-1004",
            "receiverAccountId": "ATM-TERMINAL-01",
            "amount": 35000.00,
            "currency": "INR",
            "occurredAt": "2026-09-10T06:40:00Z",
        },
        "timeDifferenceSeconds": 30,
        "message": "Sudden repeated ATM cash withdrawal burst",
    }

    resp = client.post("/fraud/verify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    print("ATM Alert Response:", json.dumps(data, indent=2))
    assert data["decision"] == "STOP"
    print(" Verified: ATM fraud alert evaluated via ATM_ML_API and returned STOP.")


if __name__ == "__main__":
    print("=" * 80)
    print("         RUNNING ZERO FRAUD 360 REST API TEST VERIFICATION SUITE         ")
    print("=" * 80)
    test_health()
    test_user_exact_fraud_verify_json()
    test_user_plain_text_response()
    test_payment_events_end_to_end_trigger()
    test_atm_fraud_alert()
    print("\n" + "=" * 80)
    print("          ALL ZERO FRAUD 360 REST API TESTS PASSED SUCCESSFULLY!          ")
    print("=" * 80)
