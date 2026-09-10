# ZeroFraud360 — Real-Time Money-Flow Fraud Detection Specification

## 1. Purpose

`ZeroFraud360` is the **main fraud-monitoring Spring Boot application** for the banking simulation project.

There are currently two Spring Boot applications under:

```text
/backend
├── IndianBankSimulation/
└── ZeroFraud360/
```

Responsibilities:

```text
IndianBankSimulation
    └── Simulates banks, accounts, payments, ledger, settlement and holds.

ZeroFraud360
    └── Consumes successful payment events, detects suspicious rapid money-flow,
        asks an external decision API whether to stop the transaction, and can
        instruct IndianBankSimulation to HOLD the suspicious funds.
```

Primary scenario:

```text
Account A --₹10,000--> Account B
Account B --₹10,000--> Account C   (within <= 3 minutes)
```

When this pattern is detected, ZeroFraud360 creates an alert and sends the external decision API a message equivalent to:

```text
Account A sent ₹10,000 to Account B and Account B sent ₹10,000
 to Account C within 1 minute of the first transaction.
Is this fraud and should this transaction be stopped?
```

The external API returns:

```text
ALLOW
```
or
```text
STOP
```

When `STOP` is returned, ZeroFraud360 immediately asks IndianBankSimulation to place the amount received by Account C on `HOLD` for 10 minutes, or until an authorized officer releases the hold.

**Accuracy boundary:** this is an educational simulation. It must not claim to reproduce private NPCI/RBI/bank protocols or proprietary implementations.

---

# 2. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │ Frontend / Users      │
                         └──────────┬───────────┘
                                    │
                                    v
                         ┌──────────────────────┐
                         │ IndianBankSimulation │
                         │ Accounts / Payments  │
                         │ Ledger / Settlement  │
                         └──────────┬───────────┘
                                    │
                         PAYMENT_SUCCESS EVENT
                                    │
                           Kafka / Event Bus
                                    │
                                    v
                         ┌──────────────────────┐
                         │     ZeroFraud360     │
                         │                      │
                         │ Event Ingestion      │
                         │ Transaction Store    │
                         │ 3-Minute Detector    │
                         │ Alert Engine         │
                         │ Decision Client      │
                         │ Hold Coordinator     │
                         │ Audit / Metrics      │
                         └───────┬──────────────┘
                                 │
                         suspicious pattern
                                 │
                                 v
                       ┌────────────────────────┐
                       │ External Decision API  │
                       │ localhost:<PORT>       │
                       └────────────┬───────────┘
                                    │
                              ALLOW / STOP
                                    │
                              STOP only
                                    v
                         ┌──────────────────────┐
                         │ IndianBankSimulation │
                         │ Internal Hold API    │
                         └──────────┬───────────┘
                                    │
                                    v
                               Account C
                              funds ON HOLD
```

Do **not** let ZeroFraud360 directly modify the IndianBankSimulation database.

Correct boundary:

```text
ZeroFraud360 --authenticated internal API--> IndianBankSimulation
```

or, for asynchronous events:

```text
IndianBankSimulation --> Kafka --> ZeroFraud360
```

---

# 3. Core Trigger

ZeroFraud360 runs continuously as a service. It is not started and stopped for each payment.

The **trigger point** is a successful payment event from IndianBankSimulation:

```text
PAYMENT_SUCCESS
```

Do not create fraud-flow observations for only:

```text
PAYMENT_CREATED
AUTHENTICATION_PENDING
PAYMENT_FAILED
PAYMENT_CANCELLED
```

unless a future rule explicitly needs them.

---

# 4. Integration Event Contract

Create one stable `PaymentSuccessEvent` used by both Kafka and optional REST ingestion.

Example:

```json
{
  "eventId": "EVT-001",
  "eventType": "PAYMENT_SUCCESS",
  "transactionId": "TXN-002",
  "occurredAt": "2026-09-10T04:16:00Z",
  "sender": {
    "accountId": "ACC-B",
    "accountNumber": "2000000001",
    "bankId": "BANK_B"
  },
  "receiver": {
    "accountId": "ACC-C",
    "accountNumber": "3000000001",
    "bankId": "BANK_C"
  },
  "amount": 10000,
  "currency": "INR",
  "paymentRail": "SIMULATED_UPI",
  "correlationId": "CORR-123",
  "messageId": "MSG-123"
}
```

Never include:

```text
password
UPI PIN
PIN hash
JWT secret
service token
private keys
```

---

# 5. Version-1 Fraud Rule

Implement exactly one deterministic rule first: `RapidPassThroughRule`.

A suspicious chain exists when all conditions are true:

```text
T1.status = SUCCESS
T2.status = SUCCESS
T1.receiverAccountId == T2.senderAccountId
T1.occurredAt < T2.occurredAt
T2.occurredAt - T1.occurredAt <= 3 minutes
T1.amount == T2.amount
T1.currency == T2.currency
T1 and T2 are not reversals
```

Example:

```text
T1  10:00:00  A -> B  ₹10,000
T2  10:01:00  B -> C  ₹10,000

Difference = 60 seconds

=> SUSPICIOUS_MONEY_CHAIN
```

Not suspicious under this first rule:

```text
A -> B ₹10,000
B -> C ₹10,000 after 4 minutes
```

or

```text
A -> B ₹10,000
B -> C ₹9,000 after 1 minute
```

The rule must be configurable so these restrictions can later be changed without rewriting the entire pipeline.

---

# 6. Time Handling

Use the authoritative bank-event timestamp `occurredAt`, not frontend time or event-arrival time.

Use Java:

```java
Instant
```

Internally store timestamps in UTC.

Display in UI using:

```text
Asia/Kolkata
```

A late event still uses its `occurredAt` for the 3-minute rule.

Do not create one `Thread`, `Timer`, or `Thread.sleep()` per payment. Persist events and query the previous 3 minutes.

---

# 7. Main ZeroFraud360 Components

Create clear responsibilities for:

```text
Event Ingestion
Event Deduplication
Observed Transaction Store
Money Flow Tracker
Fraud Rule Engine
Fraud Alert Service
Decision API Client
Decision Processor
Hold Coordinator
Hold Status Tracker
Officer Service
Audit Service
Metrics / Monitoring
Scheduled expiration/reconciliation jobs
```

Business logic must not live inside controllers or Kafka listener methods.

---

# 8. Suggested Domain Model

## ObservedTransaction

Fields:

```text
id
user/event IDs
transactionId
senderAccountId
receiverAccountId
senderBankId
receiverBankId
amount
currency
paymentRail
status
occurredAt
receivedAt
correlationId
messageId
createdAt
```

Create indexes on:

```text
receiverAccountId + occurredAt
senderAccountId + occurredAt
transactionId
eventId
```

Add a unique constraint for immutable event identity such as `eventId`.

## FraudAlert

Fields:

```text
id
alertId
patternType
status
firstTransactionId
secondTransactionId
sourceAccountId
intermediateAccountId
destinationAccountId
firstAmount
secondAmount
timeDifferenceSeconds
decision
decisionReason
externalDecisionRequestId
holdRequestId
createdAt
updatedAt
resolvedAt
```

Statuses:

```text
CREATED
WAITING_DECISION
ALLOW_RECEIVED
STOP_RECEIVED
HOLD_REQUESTED
HOLD_ACTIVE
RESOLVED
ERROR
```

## DecisionRequest

Fields:

```text
requestId
alertId
status
attemptCount
lastError
createdAt
updatedAt
completedAt
```

## DecisionResponse

Fields:

```text
requestId
decision
reason
receivedAt
```

## HoldRequest

Fields:

```text
requestId
alertId
transactionId
accountId
amount
status
attemptCount
bankHoldId
createdAt
updatedAt
```

---

# 9. Event Idempotency

All event consumers must be idempotent.

Create:

```text
processed_events
```

with at least:

```text
eventId
eventType
consumerName
processedAt
```

Unique constraint:

```text
eventId + consumerName
```

If the same Kafka event arrives twice:

```text
first arrival  -> process
second arrival -> recognize duplicate and do nothing
```

Do not create duplicate observations or alerts.

---

# 10. Alert Deduplication

The same transaction pair must never create multiple alerts.

Use a deterministic unique key such as:

```text
RAPID_PASS_THROUGH:{firstTransactionId}:{secondTransactionId}
```

Store it with a database unique constraint.

---

# 11. Money-Flow Tracking

Implement a `MoneyFlowTracker` that can answer:

```text
What successful transactions entered Account B during the previous 3 minutes?
```

For a current transaction:

```text
B -> C ₹10,000 at T2
```

search for:

```text
A -> B ₹10,000 at T1
```

where:

```text
T1 < T2
T2 - T1 <= 3 minutes
T1.receiverAccountId == T2.senderAccountId
T1.amount == T2.amount
T1.currency == T2.currency
```

Design the tracker so future chains such as:

```text
A -> B -> C -> D
```

can be added later, while implementing only `A -> B -> C` now.

---

# 12. Fraud Rule Interface

Use an extensible interface:

```java
public interface FraudRule {
    Optional<FraudFinding> evaluate(PaymentContext context);
}
```

Initial rule:

```text
RapidPassThroughRule
```

Do not build ML/AI fraud detection in this phase.

Future rules may include:

```text
HighVelocityRule
LargeAmountRule
ManyRecipientsRule
CircularTransferRule
LayeredTransferRule
```

---

# 13. Decision API Integration

The external fraud-decision API will run separately.

Configuration:

```yaml
fraud:
  decision-api:
    base-url: ${FRAUD_DECISION_API_URL:http://localhost:XXXX}
    decision-path: /api/fraud/decision
    connect-timeout-ms: 2000
    read-timeout-ms: 5000
```

The `XXXX` port is intentionally a placeholder until the user provides it.

Use `RestClient` or `WebClient`.

Do not hardcode the URL or port in Java code.

---

# 14. Decision Message

When an alert is created, send a request like:

```json
{
  "requestId": "DEC-ALERT-123",
  "alertId": "ALERT-123",
  "patternType": "RAPID_PASS_THROUGH",
  "firstTransaction": {
    "transactionId": "TXN-001",
    "senderAccountId": "ACC-A",
    "receiverAccountId": "ACC-B",
    "amount": 10000,
    "currency": "INR",
    "occurredAt": "2026-09-10T04:15:00Z"
  },
  "secondTransaction": {
    "transactionId": "TXN-002",
    "senderAccountId": "ACC-B",
    "receiverAccountId": "ACC-C",
    "amount": 10000,
    "currency": "INR",
    "occurredAt": "2026-09-10T04:16:00Z"
  },
  "timeDifferenceSeconds": 60,
  "message": "Account A sent ₹10,000 to Account B and Account B sent ₹10,000 to Account C within 1 minute of the first transaction. Is this fraud and should this transaction be stopped?"
}
```

Do not send secrets.

---

# 15. Decision Response

Support:

```json
{
  "requestId": "DEC-ALERT-123",
  "decision": "STOP",
  "reason": "Suspicious rapid pass-through transaction."
}
```

or:

```json
{
  "requestId": "DEC-ALERT-123",
  "decision": "ALLOW",
  "reason": "Transaction considered legitimate."
}
```

Use enum:

```text
STOP
ALLOW
```

Persist the response before enforcement.

---

# 16. ALLOW Flow

```text
FINDING
  |
  v
ALERT CREATED
  |
  v
WAITING_DECISION
  |
  v
ALLOW
  |
  v
RESOLVED
```

No hold is created.

---

# 17. STOP Flow

```text
FINDING
  |
  v
ALERT CREATED
  |
  v
WAITING_DECISION
  |
  v
STOP
  |
  v
HOLD_REQUESTED
  |
  v
IndianBankSimulation
  |
  v
HOLD_ACTIVE
```

Hold only the suspicious amount that reached Account C.

---

# 18. HOLD Semantics

A hold is **not a debit**.

Example:

```text
Account C ledger balance = ₹25,000
Suspicious amount        = ₹10,000
```

After hold:

```text
Ledger balance    = ₹25,000
Held amount       = ₹10,000
Available balance = ₹15,000
```

The money still belongs to C; it is simply unavailable for new outgoing transactions.

---

# 19. IndianBankSimulation Internal Hold API

Implement inside `IndianBankSimulation`:

```http
POST /internal/v1/accounts/{accountId}/holds
```

Request:

```json
{
  "requestId": "HOLD-ALERT-123",
  "transactionId": "TXN-002",
  "alertId": "ALERT-123",
  "amount": 10000,
  "currency": "INR",
  "durationMinutes": 10,
  "reasonCode": "FRAUD_ALERT",
  "source": "ZERO_FRAUD_360"
}
```

Response:

```json
{
  "holdId": "HOLD-9001",
  "accountId": "ACC-C",
  "amount": 10000,
  "status": "ACTIVE",
  "expiresAt": "2026-09-10T04:26:00Z"
}
```

The endpoint must be internal-only, authenticated, authorized, audited, and idempotent.

---

# 20. Hold Entity in IndianBankSimulation

Suggested fields:

```text
id
holdId
accountId
transactionId
alertId
amount
currency
reasonCode
source
status
createdAt
expiresAt
releasedAt
releaseReason
version
```

Statuses:

```text
ACTIVE
RELEASED
EXPIRED
CANCELLED
```

Never delete a hold record merely because it expired.

---

# 21. Hold Idempotency

Use a stable request ID such as:

```text
HOLD-{alertId}
```

If ZeroFraud360 sends the same request twice due to a lost HTTP response:

```text
first request  -> creates hold
retry           -> returns existing hold
```

Never create two ₹10,000 holds for one alert.

---

# 22. Hold Expiration

Do not create a Java timer per hold.

Store:

```text
expiresAt = createdAt + 10 minutes
```

Use a scheduled database job to release expired holds.

Example logic:

```text
Every configurable interval:
    find ACTIVE holds where expiresAt <= now
    release them atomically
    write audit event
```

Suggested development interval:

```yaml
holds:
  expiration-check-interval-ms: 15000
```

The actual interval must be configurable.

---

# 23. Officer Release

Create an officer-only endpoint:

```http
POST /api/officer/holds/{holdId}/release
```

Request:

```json
{
  "officerId": "OFFICER-001",
  "reason": "Manual review completed; transaction normalized."
}
```

Use Spring Security roles:

```text
ROLE_FRAUD_OFFICER
ROLE_ADMIN
```

The officer API in ZeroFraud360 coordinates the release with IndianBankSimulation's internal hold service.

---

# 24. Available-Balance Enforcement

When a hold exists:

```text
ledgerBalance = ₹25,000
heldAmount = ₹10,000
availableBalance = ₹15,000
```

A new outgoing transfer of ₹16,000 must fail.

A transfer of ₹15,000 may pass if all other normal bank rules pass.

The account service must use available funds, not raw ledger balance, for spend authorization.

---

# 25. Kafka Architecture

Preferred event path:

```text
IndianBankSimulation
        |
        v
   bank.payment.success
        |
        v
   ZeroFraud360
```

Start with topic:

```text
bank.payment.success
```

Future topics may include:

```text
bank.payment.reversed
bank.account.hold.created
bank.account.hold.released
```

Use an appropriate account/transaction key intentionally.

---

# 26. Outbox in IndianBankSimulation

The payment event must be written using an outbox pattern:

```text
DB transaction
    |
    +-- payment status = SUCCESS
    +-- ledger entries
    +-- outbox event
    |
    COMMIT
       |
       v
Outbox publisher
       |
       v
Kafka
```

Avoid coupling a financial DB commit directly to an unreliable network publish.

---

# 27. REST Fallback Event Adapter

Before Kafka is ready, allow:

```http
POST /internal/v1/events/payment-success
```

in ZeroFraud360.

It must accept the same `PaymentSuccessEvent` schema as Kafka.

Both adapters must call the same service:

```java
public interface PaymentEventProcessor {
    void process(PaymentSuccessEvent event);
}
```

Do not duplicate fraud logic between HTTP and Kafka.

---

# 28. Decision API Resilience

Handle:

```text
connection refused
connect timeout
read timeout
HTTP 500
HTTP 503
invalid JSON
invalid decision value
```

Use bounded retries with backoff for transient failures.

Persist the decision request before delivery.

Keep one stable request ID across retries.

Do not silently convert every technical failure into `STOP`.

The fallback policy must be configurable and documented.

---

# 29. Hold Enforcement Failure

If decision is `STOP` but the hold call fails:

```text
STOP_RECEIVED
      |
      v
HOLD_REQUESTED
      |
      +--> success --> HOLD_ACTIVE
      |
      +--> temporary failure --> retry
      |
      +--> permanent failure --> ERROR + alert escalation state
```

Never report `HOLD_ACTIVE` until IndianBankSimulation has confirmed the hold.

---

# 30. Critical Timeout Scenario

Handle:

```text
BankSimulation successfully creates the hold
but ZeroFraud360 loses the HTTP response.
```

ZeroFraud360 retries the same:

```text
HOLD-{alertId}
```

IndianBankSimulation returns the existing hold.

Result:

```text
ONE hold
not two holds
```

---

# 31. Transaction Processing Sequence

```text
A -> B ₹10,000
        |
        v
IndianBankSimulation
        |
        | PAYMENT_SUCCESS
        v
ZeroFraud360 stores T1
        |
        v
Wait for related events
        |
        v
B -> C ₹10,000 within 3 min
        |
        v
ZeroFraud360 stores T2
        |
        v
RapidPassThroughRule
        |
        v
ALERT
        |
        v
Decision API
        |
        +-------- ALLOW --------> Resolve
        |
        +-------- STOP ---------> Hold C
                                   |
                                   v
                              10 minutes
                                   |
                         +---------+---------+
                         |                   |
                         v                   v
                 Officer release        Expiration
                         |                   |
                         +---------+---------+
                                   |
                                   v
                              normalized
```

---

# 32. Database for ZeroFraud360

Use PostgreSQL + Flyway.

Minimum tables:

```text
observed_transactions
processed_events
fraud_alerts
fraud_findings
decision_requests
decision_responses
hold_requests
audit_events
```

Recommended migration sequence:

```text
V1__create_observed_transactions.sql
V2__create_processed_events.sql
V3__create_fraud_alerts.sql
V4__create_decision_requests.sql
V5__create_decision_responses.sql
V6__create_hold_requests.sql
V7__create_audit_events.sql
```

Use:

```yaml
spring.jpa.hibernate.ddl-auto: validate
```

Do not use `create`/`create-drop` for the main development database once migrations exist.

---

# 33. Security

ZeroFraud360 must use Spring Security.

Protect:

```text
customer APIs
fraud admin APIs
officer APIs
internal hold APIs
```

Internal service communication:

```text
ZeroFraud360 --service authentication--> IndianBankSimulation
```

A first implementation may use a service token from environment variables:

```yaml
bank-simulation:
  base-url: ${BANK_SIMULATION_BASE_URL:http://localhost:XXXX}
  service-token: ${BANK_SIMULATION_SERVICE_TOKEN}
```

Never hardcode secrets.

Make the integration layer replaceable with stronger service authentication later.

---

# 34. Correlation IDs

Every flow must be traceable.

Maintain:

```text
eventId
transactionId
alertId
decisionRequestId
holdRequestId
correlationId
```

Pass:

```text
X-Correlation-Id
```

through REST and Kafka headers where possible.

Example:

```text
TXN-002
   |
   v
ALERT-123
   |
   v
DEC-123
   |
   v
HOLD-9001
```

---

# 35. Audit

Record immutable audit events for:

```text
PAYMENT_EVENT_RECEIVED
PAYMENT_EVENT_DUPLICATE
FRAUD_PATTERN_DETECTED
FRAUD_ALERT_CREATED
DECISION_REQUEST_SENT
DECISION_RESPONSE_RECEIVED
STOP_DECISION_RECEIVED
ALLOW_DECISION_RECEIVED
HOLD_REQUEST_SENT
HOLD_CREATED
HOLD_FAILED
HOLD_RELEASE_REQUESTED
HOLD_RELEASED
HOLD_EXPIRED
ALERT_RESOLVED
```

Never log or audit secrets such as PIN values or service tokens.

---

# 36. Logging

Use structured logs containing:

```text
timestamp
level
service
correlationId
transactionId
alertId
eventId
holdId
status
```

Example:

```text
INFO event=FRAUD_PATTERN_DETECTED alertId=ALERT-123 transactionId=TXN-002 timeDifferenceSeconds=60
```

Mask account numbers when necessary.

---

# 37. Metrics

Add Actuator and metrics such as:

```text
fraud_events_received_total
fraud_events_duplicate_total
fraud_patterns_detected_total
fraud_alerts_total
fraud_alerts_stop_total
fraud_alerts_allow_total
decision_api_success_total
decision_api_failure_total
hold_requests_total
hold_success_total
hold_failure_total
active_holds
```

Track latencies:

```text
payment-event-to-detection
 detection-to-decision
decision-to-hold
```

---

# 38. Suggested ZeroFraud360 Package Structure

```text
src/main/java/com/example/zerofraud360/
├── ZeroFraud360Application.java
├── common/
│   ├── config/
│   ├── exception/
│   ├── security/
│   ├── correlation/
│   └── audit/
├── ingestion/
│   ├── kafka/
│   ├── rest/
│   └── service/
├── transaction/
│   ├── domain/
│   ├── repository/
│   └── service/
├── fraud/
│   ├── domain/
│   ├── rule/
│   ├── repository/
│   └── service/
├── alert/
│   ├── domain/
│   ├── repository/
│   ├── service/
│   └── controller/
├── decision/
│   ├── client/
│   ├── domain/
│   ├── repository/
│   └── service/
├── hold/
│   ├── client/
│   ├── domain/
│   ├── repository/
│   └── service/
├── officer/
│   ├── controller/
│   └── service/
├── integration/
│   ├── banksimulation/
│   └── externaldecision/
└── monitoring/
```

---

# 39. DTO Rules

Never expose JPA entities directly.

Use DTOs such as:

```text
PaymentSuccessEvent
FraudAlertResponse
FraudDecisionRequest
FraudDecisionResponse
HoldRequest
HoldResponse
OfficerReleaseRequest
```

---

# 40. REST APIs in ZeroFraud360

Suggested endpoints:

```text
POST /internal/v1/events/payment-success

GET  /api/fraud/alerts
GET  /api/fraud/alerts/{alertId}
GET  /api/fraud/transactions/{accountId}/recent
GET  /api/fraud/chains/{accountId}
GET  /api/fraud/holds/{holdId}

POST /api/fraud/alerts/{alertId}/reprocess

GET  /api/officer/alerts
POST /api/officer/holds/{holdId}/release
```

Protect internal/officer endpoints appropriately.

---

# 41. Frontend Requirements for Later Phase

The frontend should eventually show:

```text
Recent suspicious chains
Active alerts
Decision status
Held account
Held amount
Hold expiration
Officer actions
```

Alert example:

```text
ALERT-123

A -> B   ₹10,000   10:00:00
B -> C   ₹10,000   10:01:00

Difference: 1 minute
Pattern: RAPID_PASS_THROUGH
Decision: STOP
Hold: ₹10,000 on C
Expires: 10:11:00
```

Real-time UI updates can use WebSocket/SSE later. Do not block the backend implementation on frontend work.

---

# 42. Test Requirements

## Unit tests

Test:

```text
RapidPassThroughRule
3-minute boundary
amount equality
currency equality
wrong-chain rejection
alert deduplication
state transitions
```

## Integration tests

Test:

```text
REST event -> PostgreSQL
Kafka event -> PostgreSQL
Event -> finding -> alert
Decision client
Hold client
```

Use Testcontainers where practical.

## Concurrency tests

Test simultaneous events and duplicate processing.

---

# 43. Mandatory End-to-End Scenario

Seed:

```text
A = ₹50,000
B = ₹20,000
C = ₹5,000
```

Execute:

```text
1. A -> B ₹10,000
2. wait 60 seconds or simulate timestamps
3. B -> C ₹10,000
```

Expected:

```text
T1 observed
T2 observed
RapidPassThroughFinding
FraudAlert created
Decision API called
```

Mock decision API returns:

```text
STOP
```

Expected:

```text
ZeroFraud360 -> hold request -> IndianBankSimulation
```

Then:

```text
C ledger balance = ₹15,000
C held amount = ₹10,000
C available balance = ₹5,000
```

After 10 minutes:

```text
C ledger balance = ₹15,000
C held amount = ₹0
C available balance = ₹15,000
```

---

# 44. Mandatory Negative Tests

### More than 3 minutes

```text
A -> B 10:00
B -> C 10:04
```

Expected: no rapid-pass-through alert.

### Different amount

```text
A -> B ₹10,000
B -> C ₹9,000 in 1 minute
```

Expected: no alert under version-1 rule.

### Wrong chain

```text
A -> B ₹10,000
D -> C ₹10,000 in 1 minute
```

Expected: no alert.

### ALLOW

Expected: no hold.

### STOP

Expected: one hold only.

### Duplicate payment event

Expected: one observed transaction, one alert at most.

### Lost hold response

Expected: one active hold after retry.

### Decision API timeout

Expected: persisted decision request and bounded retry; do not silently pretend a decision was received.

---

# 45. Concurrency and Financial Safety

When the hold is created in IndianBankSimulation:

```text
account row/state must be protected against concurrent updates
```

Use an explicit strategy such as optimistic locking with retry or appropriate database locking.

A hold and an outgoing payment must not race into an invalid state where the customer spends the held funds after the hold has been accepted.

Test a race such as:

```text
STOP arrives
        |
        +---- hold C ₹10,000
        |
        +---- C tries to send ₹10,000
```

The final state must obey the hold/available-balance invariant.

---

# 46. Failure State Machine

```text
CREATED
  |
  v
WAITING_DECISION
  |
  +---- ALLOW ------> RESOLVED
  |
  +---- STOP -------> HOLD_REQUESTED
                           |
                     +-----+------+
                     |            |
                     v            v
                HOLD_ACTIVE     ERROR
                     |
             +-------+--------+
             |                |
             v                v
       OFFICER_RELEASE    EXPIRATION
             |                |
             +-------+--------+
                     |
                     v
                 RESOLVED
```

No arbitrary state jumps.

---

# 47. Development Order

## Phase 1 — Inspect Existing Applications

Before modifying anything:

```text
1. Inspect IndianBankSimulation.
2. Inspect ZeroFraud360.
3. Read both pom.xml files.
4. Identify Java/Spring Boot versions.
5. Identify existing DB and entities.
6. Identify existing payment transaction lifecycle.
7. Identify whether Kafka already exists.
8. Identify existing security.
9. Do not overwrite existing code.
```

Produce a short architecture assessment before coding.

## Phase 2 — ZeroFraud360 Foundation

Implement:

```text
PostgreSQL
Flyway
JPA
configuration
exceptions
correlation ID
Actuator
security foundation
```

## Phase 3 — Event Ingestion

Implement:

```text
PaymentSuccessEvent
REST adapter
Kafka adapter
PaymentEventProcessor
processed_events
```

## Phase 4 — Observed Transactions

Persist successful events and indexes.

## Phase 5 — Rapid Pass-Through Rule

Implement and test the exact 3-minute same-amount A->B->C rule.

## Phase 6 — Alerts

Create alert state machine and deduplication.

## Phase 7 — Decision API

Add request persistence, idempotency, retry, timeout, response validation.

## Phase 8 — Bank Simulation Hold

Add hold entity, available balance logic, internal endpoint, expiration, officer release.

## Phase 9 — STOP Enforcement

Connect ZeroFraud360 to the bank simulation hold API.

## Phase 10 — Failure Handling

Test duplicate messages, timeouts, response loss, restarts, retries, concurrent updates.

## Phase 11 — Fraud Dashboard APIs

Expose alerts, chains, decisions, holds.

## Phase 12 — Frontend

Integrate after backend lifecycle is stable.

---

# 48. Coding-Agent Rules

The development AI MUST:

```text
1. Inspect both applications before changing code.
2. Preserve current functionality.
3. Reuse existing domain models where sensible.
4. Do not guess existing class names.
5. Keep the two Spring Boot applications separately runnable.
6. Never let ZeroFraud360 directly access the bank simulator DB.
7. Keep controllers thin.
8. Use DTOs.
9. Use BigDecimal for money.
10. Use Instant for timestamps.
11. Use explicit transaction boundaries.
12. Use idempotency for important external commands.
13. Use database constraints to enforce uniqueness.
14. Use retries only where operations are idempotent.
15. Never log secrets.
16. Use Flyway migrations.
17. Write tests before declaring a phase complete.
18. Do not add ML/AI yet.
19. Do not add SMS/email/push yet.
20. Do not invent private NPCI/RBI protocol details.
21. Clearly label simulation-specific behavior.
22. Do not claim the simulator is production banking infrastructure.
```

---

# 49. Final Definition of Done

The project is complete for this fraud-detection phase only when:

```text
A -> B ₹10,000
        |
        | <= 3 minutes
        v
B -> C ₹10,000
        |
        v
IndianBankSimulation emits PAYMENT_SUCCESS events
        |
        v
ZeroFraud360 consumes them
        |
        v
Stores both transactions
        |
        v
Detects RAPID_PASS_THROUGH
        |
        v
Creates one FraudAlert
        |
        v
Calls external Decision API
        |
        +------ ALLOW ------> no hold
        |
        +------ STOP -------> hold C ₹10,000
                                |
                                v
                           HOLD_ACTIVE
                                |
                  +-------------+-------------+
                  |                           |
                  v                           v
             Officer release             10-min expiry
                  |                           |
                  +-------------+-------------+
                                |
                                v
                         available again
```

The system must also pass:

```text
idempotency
concurrency
late events
duplicate events
decision API failure
hold API failure
lost response
hold expiration
officer release
application restart
```

---

# 50. Product Vision

The final ZeroFraud360 system demonstrates:

```text
BANK PAYMENT
    ->
EVENT INGESTION
    ->
REAL-TIME OBSERVATION
    ->
3-MINUTE MONEY-FLOW CORRELATION
    ->
FRAUD PATTERN DETECTION
    ->
EXTERNAL DECISION
    ->
STOP / ALLOW
    ->
HOLD ENFORCEMENT
    ->
OFFICER REVIEW OR EXPIRATION
    ->
AUDITABLE RESOLUTION
```

This is a simulation of a fraud-monitoring/control architecture for the user's banking-system project. It is not connected to real UPI, NPCI, RBI, or a real bank.
