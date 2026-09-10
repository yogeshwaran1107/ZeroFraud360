import random
import time
from datetime import datetime

class BankingSimulator:
    """
    ZeroFraud360 Banking Simulator & AI Fraud Detection Engine Testbed
    """
    def __init__(self, initial_balance=245800.00):
        self.balance = initial_balance
        self.is_frozen = False
        self.transaction_history = []
        self.txn_counter = 1000

    def freeze_account(self):
        self.is_frozen = True
        print("\n🚨 ACCOUNT FROZEN: All outgoing transactions are blocked by ZeroFraud360.")

    def unfreeze_account(self):
        self.is_frozen = False
        print("\n✅ ACCOUNT UNFROZEN: Normal operations restored.")

    def calculate_risk(self, amount, location, device, time_of_day, recipient):
        score = 5.0
        ip_risk = 0
        device_risk = 0
        velocity_risk = 0
        recipient_risk = 0

        # Location Analysis
        if "Lagos" in location or "Tor" in location:
            ip_risk += 45
        elif "VPN" in location or "Bucharest" in location:
            ip_risk += 30
        elif "New Delhi" in location:
            ip_risk += 10

        # Device Analysis
        if "Bot" in device:
            device_risk += 50
        elif "Emulator" in device:
            device_risk += 35

        # Amount & Time Anomaly
        if amount > 100000:
            velocity_risk += 25
        elif amount > 50000:
            velocity_risk += 15

        if "Late Night" in time_of_day:
            velocity_risk += 10

        # Recipient Check
        if "mule" in recipient.lower() or "crypto" in recipient.lower():
            recipient_risk += 25

        total_score = min(99.9, max(1.0, score + ip_risk + device_risk + velocity_risk + recipient_risk))

        return {
            "total_score": round(total_score, 1),
            "ip_risk": ip_risk,
            "device_risk": device_risk,
            "velocity_risk": velocity_risk,
            "recipient_risk": recipient_risk
        }

    def execute_transaction(self, recipient, amount, location="Home City", device="Known iPhone", time_of_day="Daytime"):
        if self.is_frozen:
            print("\n❌ TRANSACTION REJECTED: Account is frozen!")
            return False

        if amount > self.balance:
            print(f"\n⚠️ INSUFFICIENT BALANCE: Current balance ₹{self.balance:,.2f}")
            return False

        self.txn_counter += 1
        txn_id = f"TXN{self.txn_counter}"

        print(f"\n🔍 [ZeroFraud360 AI] Analyzing {txn_id}: ₹{amount:,.2f} to {recipient}...")
        time.sleep(0.3)

        risk = self.calculate_risk(amount, location, device, time_of_day, recipient)
        score = risk["total_score"]

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if score >= 65.0:
            status = "BLOCKED"
            print(f"🚨 FRAUD ALERT! Transaction {txn_id} BLOCKED! Risk Score: {score}%")
            print(f"   Reason breakdown: IP Risk: +{risk['ip_risk']}%, Device Risk: +{risk['device_risk']}%, Velocity: +{risk['velocity_risk']}%")
        elif score >= 35.0:
            status = "STEP_UP_OTP"
            print(f"⚠️ MODERATE ANOMALY: Transaction {txn_id} REQUIRES OTP. Risk Score: {score}%")
        else:
            self.balance -= amount
            status = "APPROVED"
            print(f"✅ APPROVED: ₹{amount:,.2f} sent to {recipient}. New Balance: ₹{self.balance:,.2f}")

        record = {
            "txn_id": txn_id,
            "timestamp": timestamp,
            "recipient": recipient,
            "amount": amount,
            "risk_score": f"{score}%",
            "status": status
        }
        self.transaction_history.append(record)
        return status

if __name__ == "__main__":
    print("=" * 60)
    print("      ZeroFraud360 Banking Simulator Engine (Python Core)      ")
    print("=" * 60)

    sim = BankingSimulator()
    
    # Run test scenarios
    sim.execute_transaction("Landlord Rent", 15000, "Home City", "Known iPhone", "Daytime")
    sim.execute_transaction("Mule Account 00921", 85000, "Lagos, NG (Unknown IP)", "Unregistered Emulator", "Late Night")
    sim.execute_transaction("Crypto Target Wallet", 150000, "Bucharest, RO (VPN)", "Automated Bot", "Late Night")
