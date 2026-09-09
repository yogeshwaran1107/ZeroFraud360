# ZeroFraud360 — Real-Time Money-Flow Fraud Detection Service

`ZeroFraud360` is an autonomous fraud-monitoring Spring Boot service running on port `8081` with its own isolated database (`zerofraud360_db`). It ingests real-time banking transaction events, detects rapid money-flow anomalies ($A \rightarrow B \rightarrow C \le 3\text{ min}$), queries an external decision API (`localhost:xxxx/fraud/verify`), and enforces real-time fund holds on `IndianBankSimulation`.

---

## 1. System Architecture

```text
  [IndianBankSimulation] (Port 8080, DB: banksim_db)
            |
            | Payment Succeeded ($A \rightarrow B$, then $B \rightarrow C$)
            v
     PAYMENT_SUCCESS Event
            |
            v
  [ZeroFraud360] (Port 8081, DB: zerofraud360_db)
     ├── Event Ingestion & Idempotency Store (processed_events)
     ├── Observed Transaction Store (observed_transactions)
     ├── Money Flow Tracker & 3-Minute Window Scanner
     ├── RapidPassThroughRule (A -> B -> C <= 180s, equal amount)
     ├── Fraud Alert Engine (fraud_alerts)
     ├── External Decision Client
     │         |
     │         v
     │   [External Decision API] (http://localhost:xxxx/fraud/verify)
     │         |
     │   Returns "ALLOW" or "STOP"
     │         |
     └── On "STOP" -> Hold Coordinator
               |
               v
  [IndianBankSimulation Internal Hold API] (POST /internal/v1/accounts/{acc}/holds)
               |
               v
    Account C Funds Held (Available balance reduced, preventing cash-out)
```

---

## 2. External Decision API Configuration

> [!IMPORTANT]
> **Location of Decision API Configuration**:
> File: `Backend/ZeroFraud360/src/main/resources/application.yml`
> 
> ```yaml
> fraud:
>   decision-api:
>     base-url: ${FRAUD_DECISION_API_URL:http://localhost:xxxx}
>     verify-path: /fraud/verify
>     connect-timeout-ms: 2000
>     read-timeout-ms: 5000
> ```
> 
> **How to Set the Actual Port**:
> When your external decision API is ready, you can either:
> 1. Directly replace `xxxx` with your port in `Backend/ZeroFraud360/src/main/resources/application.yml` (e.g. `http://localhost:8000`), or
> 2. Pass the environment variable when starting the application:
>    ```bash
>    export FRAUD_DECISION_API_URL="http://localhost:8000"
>    ```

### Request Payload Sent to `http://localhost:xxxx/fraud/verify`:
```json
{
  "requestId": "DEC-ALERT-A1B2C3D4",
  "alertId": "ALERT-A1B2C3D4",
  "patternType": "RAPID_PASS_THROUGH",
  "firstTransaction": {
    "transactionId": "TXN-1001",
    "senderAccountId": "1000000001",
    "receiverAccountId": "2000000001",
    "amount": 10000.00,
    "currency": "INR",
    "occurredAt": "2026-09-10T04:15:00Z"
  },
  "secondTransaction": {
    "transactionId": "TXN-1002",
    "senderAccountId": "2000000001",
    "receiverAccountId": "3000000001",
    "amount": 10000.00,
    "currency": "INR",
    "occurredAt": "2026-09-10T04:16:00Z"
  },
  "timeDifferenceSeconds": 60,
  "message": "Account 1000000001 sent ₹10000 to Account 2000000001 and Account 2000000001 sent ₹10000 to Account 3000000001 within 1 minute of the first transaction. Is this fraud and should this transaction be stopped?"
}
```

### Expected Response from `http://localhost:xxxx/fraud/verify`:
Either JSON:
```json
{
  "requestId": "DEC-ALERT-A1B2C3D4",
  "decision": "STOP",
  "reason": "Suspicious rapid pass-through pattern detected."
}
```
or raw text:
```text
STOP
```
or
```text
ALLOW
```

---

## 3. ZeroFraud360 REST Endpoints

### 1. Ingest Payment Success Event
- **Endpoint**: `POST /internal/v1/events/payment-success`
- **Description**: Ingests durable bank payment events. Idempotent on `eventId + consumerName`.
- **Request Body**:
  ```json
  {
    "eventId": "EVT-001",
    "eventType": "PAYMENT_SUCCESS",
    "transactionId": "TXN-001",
    "occurredAt": "2026-09-10T04:16:00Z",
    "sender": {
      "accountId": "ACC-2000000001",
      "accountNumber": "2000000001",
      "bankId": "BANK_B"
    },
    "receiver": {
      "accountId": "ACC-3000000001",
      "accountNumber": "3000000001",
      "bankId": "BANK_C"
    },
    "amount": 10000.00,
    "currency": "INR",
    "paymentRail": "SIMULATED_UPI",
    "correlationId": "CORR-123",
    "messageId": "MSG-123"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "eventId": "EVT-001",
    "status": "PROCESSED"
  }
  ```

### 2. Fetch All Fraud Alerts
- **Endpoint**: `GET /api/fraud/alerts`
- **Description**: Returns all detected fraud alerts ordered by newest first.
- **Response**: `200 OK`
  ```json
  [
    {
      "id": 1,
      "alertId": "ALERT-D683707CA9",
      "dedupKey": "RAPID_PASS_THROUGH:TXN-001:TXN-002",
      "patternType": "RAPID_PASS_THROUGH",
      "status": "HOLD_ACTIVE",
      "firstTransactionId": "TXN-001",
      "secondTransactionId": "TXN-002",
      "sourceAccountId": "1000000001",
      "intermediateAccountId": "2000000001",
      "destinationAccountId": "3000000001",
      "firstAmount": 10000.00,
      "secondAmount": 10000.00,
      "timeDifferenceSeconds": 60,
      "decision": "STOP",
      "decisionReason": "Rapid pass-through detected: STOP transaction",
      "externalDecisionRequestId": "DEC-ALERT-D683707CA9",
      "holdRequestId": "HOLD-ALERT-D683707CA9",
      "createdAt": "2026-09-10T04:16:05Z",
      "updatedAt": "2026-09-10T04:16:06Z",
      "resolvedAt": null
    }
  ]
  ```

### 3. Fetch Alert by Alert ID
- **Endpoint**: `GET /api/fraud/alerts/{alertId}`
- **Response**: `200 OK` with the alert entity or `404 Not Found`.

### 4. Fetch All Observed Transactions
- **Endpoint**: `GET /api/fraud/transactions`
- **Response**: `200 OK` with list of recorded transactions across all simulated banks.

### 5. Officer Hold Release
- **Endpoint**: `POST /api/officer/holds/{holdId}/release`
- **Description**: Unlocks held funds on the target bank account after investigation.
- **Request Body**:
  ```json
  {
    "officerId": "OFFICER-42",
    "reason": "Customer verified via phone call, transfer is legitimate."
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "holdId": "HOLD-ALERT-D683707CA9",
    "status": "RELEASED",
    "officerId": "OFFICER-42",
    "reason": "Customer verified via phone call, transfer is legitimate."
  }
  ```

---

## 4. How to Run Locally

### Prerequisites
- Java 25
- MySQL running on `localhost:3306` with user `root` and password `root`

### Step 1: Start IndianBankSimulation (Port 8080)
```powershell
cd Backend\IndianBankSimulation
.\mvnw.cmd spring-boot:run
```

### Step 2: Start ZeroFraud360 (Port 8081)
```powershell
cd Backend\ZeroFraud360
.\mvnw.cmd spring-boot:run
```

### Step 3: Test Fraud Flow ($A \rightarrow B \rightarrow C$)
1. **Transfer ₹10,000 from Account A to Account B**:
   ```http
   POST http://localhost:8080/api/payments/transfer
   Content-Type: application/json

   {
     "senderAccountNumber": "1000000001",
     "receiverAccountNumber": "2000000001",
     "amount": 10000.00,
     "upiPin": "123456"
   }
   ```

2. **Transfer ₹10,000 from Account B to Account C (within 3 minutes)**:
   ```http
   POST http://localhost:8080/api/payments/transfer
   Content-Type: application/json

   {
     "senderAccountNumber": "2000000001",
     "receiverAccountNumber": "3000000001",
     "amount": 10000.00,
     "upiPin": "654321"
   }
   ```

3. **Check Fraud Alerts**:
   ```http
   GET http://localhost:8081/api/fraud/alerts
   ```
   If the Decision API returned `STOP`, Account C has ₹10,000 placed on `HOLD`!

4. **Verify Account C Balance**:
   ```http
   GET http://localhost:8080/api/accounts/3000000001
   ```
   Ledger balance = ₹15,000.00, Available balance = ₹5,000.00. Attempting to withdraw or transfer ₹6,000 will be blocked with `INSUFFICIENT_AVAILABLE_FUNDS`.
