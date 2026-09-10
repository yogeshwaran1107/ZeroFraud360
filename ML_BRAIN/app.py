"""ZeroFraud360 External ML Decision REST API.

Integrates directly with the ZeroFraud360 backend pipeline:
1. Receives fraud alerts at:
     POST /fraud/verify
2. Evaluates transactions using:
     - PATTERN_ML_API (for RAPID_PASS_THROUGH, digital transfers, botnet bursts, account takeovers)
     - ATM_ML_API (for CASH_OUT_BURST, ATM impossible travel, AePS biometric spoofing)
3. Returns standard decision:
     - JSON:  {"requestId": ..., "decision": "STOP" | "ALLOW", "reason": "..."}
     - Text:  "STOP" | "ALLOW" (when Accept: text/plain or ?format=text)
4. Provides event ingestion simulator at:
     POST /internal/v1/events/payment-success
"""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

# Ensure ROOT_DIR (ML_BRAIN) is in sys.path so PATTERN_ML_API and ATM_ML_API packages resolve cleanly
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Import model inference engines
from PATTERN_ML_API.predict import score_transaction as score_pattern_transaction
from ATM_ML_API.predict import score_transaction as score_atm_transaction

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("zero_fraud_decision_api")

app = FastAPI(
    title="ZeroFraud360 ML Decision API",
    description="External Machine Learning Decision Engine for Real-Time Fraud Interception (STOP / ALLOW)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# PYDANTIC SCHEMAS (Matching ZeroFraud360 Backend Specification)
# =============================================================================

class AccountParty(BaseModel):
    accountId: str
    accountNumber: Optional[str] = None
    bankId: Optional[str] = None


class PaymentSuccessEvent(BaseModel):
    eventId: str
    eventType: str = "PAYMENT_SUCCESS"
    transactionId: str
    occurredAt: str
    sender: AccountParty
    receiver: AccountParty
    amount: float
    currency: str = "INR"
    paymentRail: Optional[str] = "SIMULATED_UPI"
    correlationId: Optional[str] = None
    messageId: Optional[str] = None


class SubTransaction(BaseModel):
    transactionId: str
    senderAccountId: str
    receiverAccountId: str
    amount: float
    currency: str = "INR"
    occurredAt: str
    distanceFromLastKm: Optional[float] = None
    isNewDevice: Optional[int] = None
    channel: Optional[str] = None


class FraudVerifyRequest(BaseModel):
    requestId: str
    alertId: str
    patternType: str
    firstTransaction: Optional[SubTransaction] = None
    secondTransaction: Optional[SubTransaction] = None
    timeDifferenceSeconds: Optional[float] = None
    message: Optional[str] = None
    # Optional raw telemetry overrides
    telemetry: Optional[dict[str, Any]] = None


class FraudDecisionResponse(BaseModel):
    requestId: str
    decision: str  # "STOP" or "ALLOW"
    reason: str
    fraudScore: Optional[float] = None
    detectedPattern: Optional[str] = None
    topRiskFactors: Optional[list[dict[str, Any]]] = None


# In-memory store for sequence rule simulation (A -> B followed by B -> C)
recent_payment_events: list[dict[str, Any]] = []


# =============================================================================
# CORE DECISIONING LOGIC
# =============================================================================

def evaluate_alert(payload: FraudVerifyRequest) -> dict[str, Any]:
    """Evaluates an incoming ZeroFraud360 backend fraud alert against ML models."""
    pattern_type = (payload.patternType or "").upper()
    req_id = payload.requestId
    time_diff = payload.timeDifferenceSeconds or 60.0

    # Determine primary transaction for scoring
    txn2 = payload.secondTransaction
    txn1 = payload.firstTransaction

    amount = float(txn2.amount if txn2 else (txn1.amount if txn1 else 10000.0))

    # Branch 1: Cash / ATM / AePS Related Patterns -> Evaluate via ATM_ML_API
    if any(k in pattern_type for k in ["ATM", "CASH", "WITHDRAWAL", "AEPS"]):
        # Extract or derive ATM features
        # If time_diff is very short, velocity is high
        v10 = 3 if time_diff <= 180 else 1
        dev_score = 0.45 if "CHANNEL" in pattern_type else 0.35

        atm_features = {
            "withdrawal_amount": amount,
            "channel_deviation_score": dev_score,
            "velocity_10m": v10,
            "velocity_24h": v10 + 4,
            "distance_from_last_terminal_km": float(txn2.distanceFromLastKm or 25.0) if txn2 else 25.0,
            "is_off_hours": 1 if "NOCTURNAL" in pattern_type else 0,
            "failed_auth_attempts": 2 if "FAIL" in pattern_type else 0,
            "amount_to_avg_ratio": round(amount / 3000.0, 2),
        }

        # Override with any explicit telemetry
        if payload.telemetry:
            atm_features.update(payload.telemetry)

        res = score_atm_transaction(atm_features)
        score = res["fraud_score"]
        ml_dec = res["decision"]
        pat_name = res["pattern_detection"]["pattern_name"]
        top_factors = res["top_risk_factors"]

        # STOP creates a fund hold; ALLOW dismisses the alert
        decision = "STOP" if ml_dec in ("BLOCK", "MFA") else "ALLOW"
        reason = (
            f"ATM ML Model evaluated score {score*100:.1f}% ({ml_dec} risk) for {pat_name}. "
            f"Top risk factor: {top_factors[0]['description'] if top_factors else 'Nominal'}"
        )

        return {
            "requestId": req_id,
            "decision": decision,
            "reason": reason,
            "fraudScore": score,
            "detectedPattern": pat_name,
            "topRiskFactors": top_factors,
        }

    # Branch 2: Digital Transfer / Pass-Through / Structuring -> Evaluate via PATTERN_ML_API
    else:
        # Map RAPID_PASS_THROUGH sequence into model features
        # If A -> B and B -> C happened within 180 seconds, rapid velocity is confirmed
        if time_diff <= 180:
            vel_10m = 3 if amount >= 25000 else 2
            vel_24h = vel_10m + 3
        else:
            vel_10m = 0
            vel_24h = 1

        is_new_dev = int(txn2.isNewDevice if txn2 and txn2.isNewDevice is not None else 1)
        dist_km = float(txn2.distanceFromLastKm if txn2 and txn2.distanceFromLastKm is not None else 35.0)

        digital_features = {
            "amount": amount,
            "velocity_10m": vel_10m,
            "velocity_24h": vel_24h,
            "distance_from_last_km": dist_km,
            "is_new_device": is_new_dev,
        }

        # Override with any explicit telemetry
        if payload.telemetry:
            digital_features.update(payload.telemetry)

        res = score_pattern_transaction(digital_features)
        score = res["fraud_score"]
        ml_dec = res["decision"]
        pat_name = res["pattern_detection"]["pattern_name"]
        top_factors = res["top_risk_factors"]

        decision = "STOP" if ml_dec in ("BLOCK", "MFA") else "ALLOW"
        reason = (
            f"{pattern_type} confirmed by PATTERN_ML_API (Fraud Score: {score*100:.1f}%, Decision: {ml_dec}). "
            f"Top factor: {top_factors[0]['description'] if top_factors else 'Nominal'}"
        )

        return {
            "requestId": req_id,
            "decision": decision,
            "reason": reason,
            "fraudScore": score,
            "detectedPattern": pat_name,
            "topRiskFactors": top_factors,
        }


# =============================================================================
# REST API ENDPOINTS
# =============================================================================

@app.get("/health")
def health_check():
    """Health check endpoint showing operational model statuses."""
    return {
        "status": "HEALTHY",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "models_loaded": {
            "PATTERN_ML_API": True,
            "ATM_ML_API": True,
        },
        "supported_decision_actions": ["STOP", "ALLOW"],
    }


@app.post(
    "/fraud/verify",
    response_model=FraudDecisionResponse,
    responses={
        200: {
            "description": "Fraud decision response in JSON or plain text format",
            "content": {
                "application/json": {},
                "text/plain": {"example": "STOP"},
            },
        }
    },
)
def verify_fraud(
    payload: FraudVerifyRequest,
    request: Request,
    format: Optional[str] = Query(None, description="Optional response format: 'json' or 'text'"),
):
    """Primary Decision API endpoint called by ZeroFraud360 backend.

    Accepts the fraud alert JSON payload, evaluates it through the appropriate
    LightGBM booster model, and returns:
      - 'STOP': creates a fund hold / halts transaction
      - 'ALLOW': dismisses alert / permits transaction
    """
    logger.info(
        "Received fraud verification request: req_id=%s, alert_id=%s, pattern=%s",
        payload.requestId,
        payload.alertId,
        payload.patternType,
    )

    eval_result = evaluate_alert(payload)
    decision = eval_result["decision"]

    # Check if client requested plain text
    accept_header = request.headers.get("accept", "").lower()
    if format == "text" or "text/plain" in accept_header:
        logger.info("Returning plain text decision: %s", decision)
        return PlainTextResponse(content=decision, status_code=status.HTTP_200_OK)

    logger.info("Returning JSON decision: %s (req_id=%s)", decision, payload.requestId)
    return JSONResponse(content=eval_result, status_code=status.HTTP_200_OK)


@app.post("/internal/v1/events/payment-success")
def receive_payment_success_event(event: PaymentSuccessEvent):
    """Main input endpoint simulating ZeroFraud360 event ingestion.

    Evaluates consecutive payment events (e.g. A -> B followed by B -> C within 180s)
    to automatically detect and trigger the RAPID_PASS_THROUGH rule.
    """
    logger.info(
        "Ingested payment event: eventId=%s, txnId=%s, sender=%s, receiver=%s, amount=₹%.2f",
        event.eventId,
        event.transactionId,
        event.sender.accountId,
        event.receiver.accountId,
        event.amount,
    )

    current_event = event.model_dump()
    triggered_alert = None

    # Parse current timestamp
    try:
        current_dt = datetime.fromisoformat(event.occurredAt.replace("Z", "+00:00"))
    except Exception:
        current_dt = datetime.now(timezone.utc)

    # Check rule: If current event is B -> C and a preceding event was A -> B within 180 seconds with same amount
    current_sender = event.sender.accountId
    current_receiver = event.receiver.accountId

    for past_event in reversed(recent_payment_events):
        past_receiver = past_event["receiver"]["accountId"]
        past_amount = past_event["amount"]
        past_currency = past_event["currency"]

        # Check if previous receiver is current sender (A -> B then B -> C)
        if past_receiver == current_sender and past_amount == event.amount and past_currency == event.currency:
            try:
                past_dt = datetime.fromisoformat(past_event["occurredAt"].replace("Z", "+00:00"))
                diff_seconds = abs((current_dt - past_dt).total_seconds())
            except Exception:
                diff_seconds = 60.0

            if diff_seconds <= 180.0:
                logger.warning(
                    "TRIGGERED RAPID_PASS_THROUGH: %s received ₹%.2f from %s and sent to %s in %.1fs",
                    current_sender,
                    event.amount,
                    past_event["sender"]["accountId"],
                    current_receiver,
                    diff_seconds,
                )

                # Construct internal alert request
                verify_req = FraudVerifyRequest(
                    requestId=f"DEC-ALERT-{event.transactionId}",
                    alertId=f"ALERT-{event.transactionId}",
                    patternType="RAPID_PASS_THROUGH",
                    firstTransaction=SubTransaction(
                        transactionId=past_event["transactionId"],
                        senderAccountId=past_event["sender"]["accountId"],
                        receiverAccountId=past_event["receiver"]["accountId"],
                        amount=past_event["amount"],
                        currency=past_event["currency"],
                        occurredAt=past_event["occurredAt"],
                    ),
                    secondTransaction=SubTransaction(
                        transactionId=event.transactionId,
                        senderAccountId=event.sender.accountId,
                        receiverAccountId=event.receiver.accountId,
                        amount=event.amount,
                        currency=event.currency,
                        occurredAt=event.occurredAt,
                    ),
                    timeDifferenceSeconds=diff_seconds,
                    message=f"Rapid pass-through: {past_event['sender']['accountId']} -> {current_sender} -> {current_receiver} in {diff_seconds:.0f}s",
                )

                # Evaluate internally
                decision_outcome = evaluate_alert(verify_req)
                triggered_alert = decision_outcome
                break

    recent_payment_events.append(current_event)
    # Keep only the last 100 events in memory
    if len(recent_payment_events) > 100:
        recent_payment_events.pop(0)

    return {
        "status": "ACCEPTED",
        "eventId": event.eventId,
        "ruleTriggered": triggered_alert is not None,
        "alertEvaluation": triggered_alert,
    }


# Direct raw model test endpoints
@app.post("/fraud/evaluate/pattern")
def evaluate_raw_pattern(features: dict[str, Any]):
    """Direct scoring endpoint for PATTERN_ML_API features."""
    return score_pattern_transaction(features)


@app.post("/fraud/evaluate/atm")
def evaluate_raw_atm(features: dict[str, Any]):
    """Direct scoring endpoint for ATM_ML_API features."""
    return score_atm_transaction(features)


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting ZeroFraud360 Decision API on http://0.0.0.0:8000 ...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
