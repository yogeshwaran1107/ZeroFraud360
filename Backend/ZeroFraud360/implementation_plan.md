# Implementation Plan — ZeroFraud360 & IndianBankSimulation Integration

Implement the complete real-time money-flow fraud detection and hold enforcement system across two independent Spring Boot applications:
1. **`IndianBankSimulation`** (`port 8080`, DB `banksim_db`): Core banking simulation handling accounts, payments, outbox events, and account holds.
2. **`ZeroFraud360`** (`port 8081`, DB `zerofraud360_db`): Fraud monitoring service consuming payment events, detecting the 3-minute rapid pass-through pattern ($A \rightarrow B \rightarrow C$), consulting an external Decision API (`localhost:xxxx/fraud/verify`), and commanding internal holds on `IndianBankSimulation`.

---

## User Review Required

> [!IMPORTANT]
> **Decision API Configuration**:
> As specified, the external Decision API endpoint will be configured in `ZeroFraud360/src/main/resources/application.yml` as:
> ```yaml
> fraud:
>   decision-api:
>     base-url: ${FRAUD_DECISION_API_URL:http://localhost:xxxx}
>     verify-path: /fraud/verify
>     connect-timeout-ms: 2000
>     read-timeout-ms: 5000
> ```
> To set the actual port when ready, you can either:
> 1. Edit `application.yml` directly, or
> 2. Pass the environment variable: `FRAUD_DECISION_API_URL=http://localhost:<YOUR_PORT>`

> [!IMPORTANT]
> **Database Isolation**:
> `ZeroFraud360` will connect to its own database schema (`zerofraud360_db`) on MySQL `localhost:3306` (with `createDatabaseIfNotExist=true`). It will **never** access or query `banksim_db` directly, strictly honoring the architectural boundary.

---

## Proposed Changes

### 1. `IndianBankSimulation` Enhancements

#### [NEW] [V3__add_account_c_holds_payments.sql](file:///d:/Git/ZeroFraud360/Backend/IndianBankSimulation/src/main/resources/db/migration/V3__add_account_c_holds_payments.sql)
- Seed **Bank C** (`BANK_C`, "Bank of Simulation C", `SIMU000003`)
- Seed **Customer Charlie** and **Account C** (`3000000001`, `SIMU000003`, balance ₹5,000.00, `charlie@bankC`, PIN `123456`)
- Create `payment_transactions` table with index on `transaction_id`, `sender_account_id`, `receiver_account_id`
- Create `account_holds` table with fields `hold_id`, `account_id`, `transaction_id`, `alert_id`, `amount`, `status`, `expires_at`, `released_at`, `version`
- Create `outbox_events` table for durable event publishing

#### [NEW] Entities & Repositories (`IndianBankSimulation`)
- `PaymentTransaction.java` & `PaymentTransactionRepository.java`
- `AccountHold.java` & `AccountHoldRepository.java`
- `OutboxEvent.java` & `OutboxEventRepository.java`

#### [MODIFY] [AccountService.java](file:///d:/Git/ZeroFraud360/Backend/IndianBankSimulation/src/main/java/com/SIH/IndianBankSimulation/account/service/AccountService.java)
- Implement `getAvailableBalance`: computes `ledgerBalance - sum(ACTIVE holds)`.
- Ensure outgoing payment checks enforce `availableBalance >= amount`.

#### [NEW] Hold API & Expiration (`IndianBankSimulation`)
- `InternalHoldService.java`:
  - `createHold(CreateHoldRequest request)`: Idempotent on `holdId = HOLD-{alertId}`. Validates account, reduces available balance, records hold.
  - `releaseHold(String holdId, String reason)`: Releases active hold atomically.
- `InternalHoldController.java`:
  - `POST /internal/v1/accounts/{accountNumber}/holds` (authenticated via `X-Service-Token: sim-secret-token-360`).
  - `POST /internal/v1/holds/{holdId}/release`.
- `HoldExpirationScheduler.java`: `@Scheduled` task checking `expiresAt <= now` and releasing holds.

#### [NEW] Payment Execution & Outbox Publisher (`IndianBankSimulation`)
- `PaymentService.java`:
  - `executePayment(PaymentTransferRequest request)`: Atomic debit from sender, credit to receiver, creates `PaymentTransaction` with `SUCCESS`, and writes `PaymentSuccessEvent` to `outbox_events`.
- `OutboxPublisher.java`:
  - Dispatches `PAYMENT_SUCCESS` events via HTTP to ZeroFraud360 (`POST http://localhost:8081/internal/v1/events/payment-success`).

---

### 2. `ZeroFraud360` Application Implementation

#### [MODIFY] [pom.xml](file:///d:/Git/ZeroFraud360/Backend/ZeroFraud360/pom.xml)
- Add Spring Data JPA, Spring Security, Validation, Actuator, Flyway (`flyway-core` + `flyway-mysql`), MySQL Connector/J, JJWT, Jackson, and test dependencies (`h2`, `spring-boot-starter-test`, `spring-boot-starter-webmvc-test`).

#### [NEW] Configuration & Infrastructure (`ZeroFraud360`)
- `application.yml` (`server.port: 8081`, MySQL DB `zerofraud360_db`, Decision API configuration, Bank Simulation client configuration).
- `FlywayConfig.java`, `JacksonConfig.java`, `CorrelationFilter.java`, `GlobalExceptionHandler.java`, `SecurityConfig.java`.

#### [NEW] [V1__create_fraud_monitoring_schema.sql](file:///d:/Git/ZeroFraud360/Backend/ZeroFraud360/src/main/resources/db/migration/V1__create_fraud_monitoring_schema.sql)
- `processed_events`: `event_id`, `event_type`, `consumer_name`, `processed_at`, UNIQUE(`event_id`, `consumer_name`).
- `observed_transactions`: `id`, `event_id`, `transaction_id`, `sender_account_id`, `receiver_account_id`, `amount`, `currency`, `occurred_at`, `received_at`, with composite indexes.
- `fraud_alerts`: `alert_id`, `dedup_key` (UNIQUE), `pattern_type`, `status`, `first_transaction_id`, `second_transaction_id`, `source_account_id`, `intermediate_account_id`, `destination_account_id`, `first_amount`, `second_amount`, `time_difference_seconds`, `decision`, `hold_request_id`, `created_at`, `resolved_at`.
- `decision_requests` & `decision_responses`.
- `hold_requests`.

#### [NEW] Event Ingestion Module (`ZeroFraud360`)
- `PaymentSuccessEvent.java` DTO.
- `ProcessedEvent.java` & `ProcessedEventRepository.java`.
- `ObservedTransaction.java` & `ObservedTransactionRepository.java`.
- `PaymentEventProcessor.java` & `PaymentEventProcessorImpl.java`: Ingests event, verifies idempotency, saves transaction, triggers pattern detector.
- `EventIngestionController.java`: `POST /internal/v1/events/payment-success`.

#### [NEW] Rapid Pass-Through Rule & Money Flow Tracking (`ZeroFraud360`)
- `MoneyFlowTracker.java`: Queries `observed_transactions` for transactions into intermediate account within preceding 180 seconds ($T_2.\text{occurredAt} - T_1.\text{occurredAt} \le 3\text{ min}$).
- `RapidPassThroughRule.java`: Verifies exact amount equality, currency equality, non-reversal status.
- `FraudAlertService.java`: Creates single `FraudAlert` with unique dedup key `RAPID_PASS_THROUGH:{T1}:{T2}`.

#### [NEW] External Decision API Client (`ZeroFraud360`)
- `DecisionApiClient.java`:
  - Calls `http://localhost:xxxx/fraud/verify` via Spring `RestClient`.
  - Sends structured message:
    `Account A sent ₹10,000 to Account B and Account B sent ₹10,000 to Account C within 1 minute of the first transaction. Is this fraud and should this transaction be stopped?`
  - Parses `ALLOW` or `STOP`.

#### [NEW] Hold Coordinator & STOP Enforcement (`ZeroFraud360`)
- `HoldCoordinator.java`:
  - On `ALLOW` $\rightarrow$ records decision, marks alert `RESOLVED`, no hold requested.
  - On `STOP` $\rightarrow$ calls `IndianBankSimulation` `POST /internal/v1/accounts/{accountId}/holds` with `HOLD-{alertId}`.
  - Transitions alert to `HOLD_ACTIVE` on success.
- `OfficerController.java`:
  - `POST /api/officer/holds/{holdId}/release` $\rightarrow$ forwards release to `IndianBankSimulation`.
- `FraudQueryController.java`:
  - `GET /api/fraud/alerts`, `GET /api/fraud/alerts/{alertId}`.

---

## Verification Plan

### Automated Tests
1. **`IndianBankSimulation` Tests**:
   - `PaymentExecutionTest`: Tests $A \rightarrow B$ and $B \rightarrow C$ transfers update balances and emit outbox events.
   - `AccountHoldTest`: Tests creating hold reduces available balance, prevents overdraft of held funds, and releases hold.
   - `HoldExpirationTest`: Tests expired holds are released automatically.
2. **`ZeroFraud360` Tests**:
   - `RapidPassThroughRuleTest`: Unit tests for $\le 3$ min window, $> 3$ min rejection, different amount rejection.
   - `EventIngestionIdempotencyTest`: Duplicate event ingestion produces no duplicate transactions or alerts.
   - `DecisionApiClientTest`: Mock external Decision API returning `ALLOW` and `STOP`.
   - `EndToEndFraudDetectionTest`: Complete flow:
     1. $A \rightarrow B$ ₹10,000 at $T_1$.
     2. $B \rightarrow C$ ₹10,000 at $T_2 = T_1 + 60\text{s}$.
     3. Event received $\rightarrow$ pattern detected $\rightarrow$ alert created.
     4. Decision API returns `STOP` $\rightarrow$ hold requested on Account C.
     5. Account C available balance verified reduced by ₹10,000.
     6. Officer releases hold $\rightarrow$ Account C available balance restored.
