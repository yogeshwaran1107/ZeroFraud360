 yogesh
# ZeroFraud360 - Real-Time Fraud Interception Platform

ZeroFraud360 is an enterprise real-time fraud detection and fund-hold decisioning engine designed to detect, score, and intercept financial fraud in milliseconds.

## Repository Architecture

- **`ML_BRAIN/`**: Core Machine Learning and Decisioning Engine
  - **`app.py`**: Production FastAPI REST Decision Service (`/fraud/verify`, `/internal/v1/events/payment-success`, `/health`).
  - **`test_decision_api.py`**: Complete automated test suite verifying live server and in-process `TestClient` responses.
  - **`PATTERN_ML_API/`**: Digital banking, high-frequency botnet, rapid pass-through, and account takeover detection model.
  - **`ATM_ML_API/`**: ATM, AePS biometric spoofing, nocturnal cash-out burst, and channel-deviation fraud model.

## Quick Start

### 1. Run Automated Test Suite
From repository root:
```bash
python ML_BRAIN/test_decision_api.py
```
Or from `ML_BRAIN/`:
```bash
cd ML_BRAIN
python test_decision_api.py
```

### 2. Start Decision API Server
```bash
cd ML_BRAIN
python app.py
```
or via Uvicorn:
```bash
uvicorn ML_BRAIN.app:app --host 0.0.0.0 --port 8000
```
API Documentation will be accessible at: `http://localhost:8000/docs`
=======
# ZeroFraud360
sih project

Muthu
 main
