"""ZeroFraud360 End-to-End Automated Pipeline Verification Script.

Tests the full ecosystem:
1. Verifies health checks of ML_Brain (8000), IndianBankSimulation (8080), ZeroFraud360 (8081)
2. Executes legitimate transaction (Alice -> Bob Rs 500)
3. Executes suspicious rapid pass-through sequence:
   - Transaction 1: Alice -> Bob Rs 10,000
   - Transaction 2: Bob -> Charlie Rs 10,000
4. Verifies ZeroFraud360 interception, ML_Brain STOP decision, account muting / fund hold
5. Verifies account muting: transfer attempt from held account is rejected
6. Tests Officer authentication and formal fraud confirmation (funds permanently blocked)
7. Tests Officer false-positive clearance (hold released)
"""

import time
import requests
import json
import sys

ML_URL = "http://localhost:8000"
BANK_URL = "http://localhost:8080"
ZF_URL = "http://localhost:8081"

def log(msg, symbol="[INFO]"):
    clean_msg = str(msg).replace('\u20b9', 'Rs.').replace('₹', 'Rs.')
    try:
        print(f"{symbol} {clean_msg}")
    except UnicodeEncodeError:
        safe_msg = clean_msg.encode('ascii', errors='replace').decode('ascii')
        print(f"{symbol} {safe_msg}")

def test_health():
    log("Checking ML_Brain health...", "[CHECK]")
    r = requests.get(f"{ML_URL}/health", timeout=5)
    assert r.status_code == 200, f"ML_Brain health failed: {r.text}"
    log(f"ML_Brain is HEALTHY: {r.json()['models_loaded']}", "[OK]")

    log("Checking IndianBankSimulation health...", "[CHECK]")
    r = requests.get(f"{BANK_URL}/actuator/health", timeout=5)
    assert r.status_code == 200, f"BankSim health failed: {r.text}"
    log("IndianBankSimulation is HEALTHY", "[OK]")

    log("Checking ZeroFraud360 health...", "[CHECK]")
    r = requests.get(f"{ZF_URL}/actuator/health", timeout=5)
    assert r.status_code == 200, f"ZeroFraud360 health failed: {r.text}"
    log("ZeroFraud360 is HEALTHY", "[OK]")

def run_pipeline():
    # Step 1: Customer Login (Alice)
    log("Logging in as Alice Sharma (Acc: 1000000001)...", "[AUTH]")
    login_res = requests.post(f"{BANK_URL}/api/auth/login", json={
        "username": "alice",
        "password": "Password@123"
    }, timeout=5)
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    alice_token = login_res.json()["accessToken"]
    log("Alice authenticated successfully", "[OK]")

    # Check Alice's balance
    bal_res = requests.get(f"{BANK_URL}/api/accounts/me/balance", headers={"Authorization": f"Bearer {alice_token}"})
    log(f"Alice Current Available Balance: Rs {bal_res.json()['availableBalance']}", "[BALANCE]")

    # Step 2: Normal Legitimate Transaction
    log("Executing legitimate payment: Alice -> Bob (Rs 500)...", "[PAYMENT]")
    transfer_res = requests.post(f"{BANK_URL}/api/payments/transfer", json={
        "senderAccountNumber": "1000000001",
        "receiverAccountNumber": "2000000001",
        "amount": 500.0,
        "currency": "INR",
        "upiPin": "123456",
        "paymentRail": "SIMULATED_UPI"
    }, headers={"Authorization": f"Bearer {alice_token}"})
    assert transfer_res.status_code == 200, f"Transfer failed: {transfer_res.text}"
    log(f"Payment successful: TxnId={transfer_res.json()['transactionId']}", "[OK]")

    # Step 3: Trigger Rapid Pass-Through Sequence
    log("\n--- TRIGGERING SUSPICIOUS RAPID MONEY-FLOW ANOMALY ---", "[ANOMALY]")
    log("Transaction 1: Alice -> Bob Rs 10,000", "[FLOW]")
    t1_res = requests.post(f"{BANK_URL}/api/payments/transfer", json={
        "senderAccountNumber": "1000000001",
        "receiverAccountNumber": "2000000001",
        "amount": 10000.0,
        "currency": "INR",
        "upiPin": "123456",
        "paymentRail": "SIMULATED_UPI"
    }, headers={"Authorization": f"Bearer {alice_token}"})
    assert t1_res.status_code == 200, f"T1 failed: {t1_res.text}"
    t1_id = t1_res.json()["transactionId"]
    log(f"T1 completed: TxnId={t1_id}", "[OK]")

    time.sleep(1)

    # Bob immediately forwards Rs 10,000 to Charlie (Acc: 3000000001)
    log("Transaction 2 (immediate pass-through): Bob -> Charlie Rs 10,000", "[FLOW]")
    t2_res = requests.post(f"{BANK_URL}/api/payments/transfer", json={
        "senderAccountNumber": "2000000001",
        "receiverAccountNumber": "3000000001",
        "amount": 10000.0,
        "currency": "INR",
        "upiPin": "654321",
        "paymentRail": "SIMULATED_UPI"
    })
    assert t2_res.status_code == 200, f"T2 failed: {t2_res.text}"
    t2_id = t2_res.json()["transactionId"]
    log(f"T2 completed: TxnId={t2_id}", "[OK]")

    # Step 4: Authenticate Officer & Wait for Outbox event publisher and ZeroFraud360 ML evaluation
    log("Authenticating Police Officer on ZeroFraud360...", "[AUTH]")
    officer_login = requests.post(f"{ZF_URL}/api/auth/login", json={
        "username": "police",
        "password": "Police@12345"
    })
    assert officer_login.status_code == 200, f"Officer login failed: {officer_login.text}"
    police_token = officer_login.json()["accessToken"]
    log("Police Officer authenticated (ROLE_POLICE)", "[OK]")

    log("Waiting for Outbox event publisher and ZeroFraud360 ML evaluation...", "[WAIT]")
    alert_found = None
    for attempt in range(12):
        time.sleep(2)
        alerts_res = requests.get(
            f"{ZF_URL}/api/fraud/alerts",
            headers={"Authorization": f"Bearer {police_token}"}
        )
        if alerts_res.status_code == 200 and len(alerts_res.json()) > 0:
            for alert in alerts_res.json():
                if alert.get("secondTransactionId") == t2_id:
                    alert_found = alert
                    break
            if alert_found:
                break

    assert alert_found is not None, "Fraud alert was not created by ZeroFraud360!"
    log(f"Fraud Alert Created: AlertId={alert_found['alertId']}, Status={alert_found['status']}", "[ALERT]")
    log(f"ML_Brain Decision: {alert_found.get('decision')} | Reason: {alert_found.get('decisionReason')}", "[ML_DECISION]")
    assert alert_found.get("decision") == "STOP", f"Expected STOP decision, got {alert_found.get('decision')}"

    # Step 5: Verify Account Muting in IndianBankSimulation
    log("\n--- VERIFYING ACCOUNT MUTING & RESTRICTION ---", "[SECURITY]")
    holds_res = requests.get(f"{BANK_URL}/internal/v1/holds/{alert_found['holdRequestId']}", headers={"X-Service-Token": "sim-secret-token-360"})
    assert holds_res.status_code == 200, f"Hold lookup failed: {holds_res.text}"
    hold_data = holds_res.json()
    log(f"Active Hold Confirmed: Account={hold_data['accountId']}, Amount=Rs {hold_data['amount']}, Status={hold_data['status']}", "[HOLD]")
    assert hold_data["status"] == "ACTIVE", "Hold is not ACTIVE!"

    # Verify attempt to withdraw from held account fails
    log("Testing transfer from restricted destination account (expecting rejection)...", "[TEST]")
    blocked_transfer = requests.post(f"{BANK_URL}/api/payments/transfer", json={
        "senderAccountNumber": alert_found["destinationAccountId"],
        "receiverAccountNumber": "1000000001",
        "amount": 10000.0,
        "currency": "INR",
        "upiPin": "123456",
        "paymentRail": "SIMULATED_UPI"
    })
    log(f"Withdrawal attempt status: {blocked_transfer.status_code} (Rejection expected)", "[REJECT]")
    assert blocked_transfer.status_code >= 400, "Transfer from held account was unexpectedly permitted!"
    log("Account is successfully MUTED and restricted from outgoing transactions", "[OK]")

    # Step 6: Verify Urgent Broadcast Notifications
    log("\n--- VERIFYING BROADCAST NOTIFICATIONS ---", "[NOTIFICATIONS]")
    notif_res = requests.get(
        f"{ZF_URL}/api/notifications/alert/{alert_found['alertId']}",
        headers={"Authorization": f"Bearer {police_token}"}
    )
    assert notif_res.status_code == 200, f"Failed to query notifications: {notif_res.text}"
    notifs = notif_res.json()
    log(f"Total Broadcast Notifications Dispatched: {len(notifs)}", "[DISPATCH]")
    for n in notifs:
        log(f" -> [{n['recipientType']}] ({n['channel']}): {n['message']}", "[MSG]")
    assert len(notifs) >= 4, "Expected at least 4 notifications (Police, Cyber, Bank, Victim)"

    # Step 7: Officer Formal Fraud Confirmation
    log("\n--- TESTING OFFICER FORMAL CONFIRMATION (CONFIRM FRAUD) ---", "[OFFICER]")
    confirm_res = requests.post(
        f"{ZF_URL}/api/officer/holds/{alert_found['holdRequestId']}/confirm-fraud",
        json={"officerId": "police", "reason": "Confirmed mule money laundering under FIR #2026-99"},
        headers={"Authorization": f"Bearer {police_token}"}
    )
    assert confirm_res.status_code == 200, f"Confirm fraud failed: {confirm_res.text}"
    log("Officer confirmed fraud: Status = CONFIRMED_FRAUD", "[OK]")

    # Verify hold is permanently BLOCKED on IndianBankSimulation
    blocked_hold = requests.get(f"{BANK_URL}/internal/v1/holds/{alert_found['holdRequestId']}", headers={"X-Service-Token": "sim-secret-token-360"}).json()
    log(f"Bank Simulator Fund Status: {blocked_hold['status']} (PERMANENTLY BLOCKED)", "[BLOCKED]")
    assert blocked_hold["status"] == "BLOCKED", f"Expected BLOCKED status, got {blocked_hold['status']}"

    # Step 8: Officer Release Hold (False Positive clearance test)
    log("\n--- TESTING OFFICER RELEASE (FALSE POSITIVE CLEARANCE) ---", "[OFFICER]")
    release_res = requests.post(
        f"{ZF_URL}/api/officer/holds/{alert_found['holdRequestId']}/release",
        json={"officerId": "police", "reason": "Formal clearance and case dismissed"},
        headers={"Authorization": f"Bearer {police_token}"}
    )
    assert release_res.status_code == 200, f"Release failed: {release_res.text}"
    log("Officer released hold: Status = RELEASED", "[OK]")

    released_hold = requests.get(f"{BANK_URL}/internal/v1/holds/{alert_found['holdRequestId']}", headers={"X-Service-Token": "sim-secret-token-360"}).json()
    log(f"Bank Simulator Fund Status: {released_hold['status']} (HOLD RESTORED/CLEARED)", "[CLEARED]")
    assert released_hold["status"] == "RELEASED", f"Expected RELEASED status, got {released_hold['status']}"

    log("\n===========================================================", "[SUCCESS]")
    log("ALL 5 PIPELINE COMPONENTS FULLY VERIFIED & WORKING TOGETHER!", "[SUCCESS]")
    log("===========================================================", "[SUCCESS]")

if __name__ == "__main__":
    try:
        test_health()
        run_pipeline()
    except Exception as e:
        print(f"\n[ERROR] Pipeline Verification Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
