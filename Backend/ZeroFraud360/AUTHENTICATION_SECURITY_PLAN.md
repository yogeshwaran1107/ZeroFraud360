# Implementation Plan — ZeroFraud360 & IndianBankSimulation Authentication & Secure Hold Integration

Implement the complete authentication and authorization architecture as specified in [`Backend/ZeroFraud360_Authentication_Security_Specification.md`](file:///d:/Git/ZeroFraud360/Backend/ZeroFraud360_Authentication_Security_Specification.md) across both independent Spring Boot applications without breaking the existing verified fraud-monitoring workflow.

---

## User Review Required

> [!IMPORTANT]
> **Separation of Human Credentials and Service Credentials**:
> - **Human Users**: Authenticate only to `ZeroFraud360` (`port 8081`) via `/api/auth/login` using username/password to receive a Bearer JWT. Exactly three predefined users will be seeded:
>   - `police` / `Police@12345` (Role: `ROLE_POLICE`)
>   - `cyber` / `Cyber@12345` (Role: `ROLE_CYBER`)
>   - `bank` / `Bank@12345` (Role: `ROLE_BANK`)
> - **Service Identity**: `ZeroFraud360` backend authenticates to `IndianBankSimulation` (`port 8080`) using `X-Service-Token: ${BANK_SIMULATION_SERVICE_TOKEN}`. Human user JWTs are **never** forwarded to `IndianBankSimulation`.
> - **Customer APIs**: `IndianBankSimulation` customer simulation APIs (`/api/accounts/**`, `/api/payments/**`, `/api/auth/**`) remain accessible to the frontend without requiring the new officer login, preserving the existing simulation frontend.

> [!IMPORTANT]
> **Externalized Secrets**:
> All secrets will be externalized with fallback defaults for local development:
> - `ZEROFRAUD_JWT_SECRET`: signing secret for ZeroFraud360 JWTs.
> - `BANK_SIMULATION_SERVICE_TOKEN`: shared secret for ZeroFraud360 calling IndianBankSimulation internal hold APIs.
> A `.env.example` file will be created with placeholder values.

---

## Current Architecture Report

1. **`IndianBankSimulation`** (`port 8080`, DB `banksim_db`):
   - **Runtime**: Java 25, Spring Boot 4.1.1.
   - **Current Security**: `SecurityConfig.java` has `/internal/v1/**` and `/api/payments/**` in `permitAll()`. `InternalHoldController` manually checks `X-Service-Token`.
   - **Hold & Payments**: `PaymentService` performs atomic transfers with available-balance enforcement (`ledger - activeHolds`) and transactional outbox event logging. `InternalHoldService` places idempotent holds on `holdId = HOLD-{alertId}`.
   - **Tests**: 15 tests, 0 failures (`BUILD SUCCESS`).

2. **`ZeroFraud360`** (`port 8081`, DB `zerofraud360_db`):
   - **Runtime**: Java 25, Spring Boot 4.1.1.
   - **Current Security**: `SecurityConfig.java` has all endpoints in `permitAll()`. No `users` table exists.
   - **Fraud Detection**: `PaymentEventProcessorImpl` guarantees idempotent event consumption; `MoneyFlowTracker` and `RapidPassThroughRule` detect $A \rightarrow B \rightarrow C \le 180\text{s}$; `DecisionApiClient` queries `localhost:xxxx/fraud/verify`; `HoldCoordinator` calls `IndianBankSimulation` internal hold API.
   - **Test Suite**: 6 tests, 0 failures (`BUILD SUCCESS`).

---

## Proposed Changes

### Phase 1: ZeroFraud360 Users, Password Hashing & JWT Login

#### [NEW] [V2__create_users_and_seed_officers.sql](file:///d:/Git/ZeroFraud360/Backend/ZeroFraud360/src/main/resources/db/migration/V2__create_users_and_seed_officers.sql)
- Creates `users` table: `id`, `username` UNIQUE, `password_hash`, `role`, `enabled`, `failed_login_attempts`, `locked_until`, `created_at`, `updated_at`.
- Seeds the 3 predefined users (`police`, `cyber`, `bank`) with BCrypt password hashes.

#### [NEW] User Domain & Repository (`ZeroFraud360`)
- `User.java` (Entity in `com.SIH.ZeroFraud360.auth.domain`)
- `Role.java` (Enum: `ROLE_POLICE`, `ROLE_CYBER`, `ROLE_BANK`)
- `UserRepository.java`

#### [NEW] Auth DTOs (`ZeroFraud360`)
- `LoginRequest.java`: `username`, `password`
- `AuthResponse.java`: `accessToken`, `tokenType` ("Bearer"), `expiresIn`, `username`, `role`
- `UserProfileDto.java`: `username`, `role`

#### [NEW] JWT & UserDetails Services (`ZeroFraud360`)
- `JwtProvider.java`: Signs and validates HMAC-SHA256 JWTs with `sub`, `role`, `iat`, `exp` claims using `security.jwt.secret` (or `app.jwt.secret`).
- `UserPrincipal.java`: Implements `UserDetails`.
- `CustomUserDetailsService.java`: Implements `UserDetailsService`, loads user from `UserRepository`, checks account lock status.
- `AuthService.java`: Authenticates credentials with `PasswordEncoder.matches()`, tracks failed attempts (temporary lock after 5 attempts), generates JWT, returns `AuthResponse`.

#### [NEW] Auth Controller (`ZeroFraud360`)
- `AuthController.java`:
  - `POST /api/auth/login`: Public login endpoint.
  - `GET /api/auth/me`: Authenticated endpoint returning current user profile.
  - `POST /api/auth/logout`: Endpoint acknowledging token revocation.

---

### Phase 2: ZeroFraud360 API Protection & Roles

#### [NEW] [JwtAuthenticationFilter.java](file:///d:/Git/ZeroFraud360/Backend/ZeroFraud360/src/main/java/com/SIH/ZeroFraud360/common/security/JwtAuthenticationFilter.java)
- Extracts `Authorization: Bearer <token>`, validates signature and expiration, loads `UserDetails`, and sets authenticated `UsernamePasswordAuthenticationToken` into `SecurityContextHolder`.

#### [MODIFY] [SecurityConfig.java](file:///d:/Git/ZeroFraud360/Backend/ZeroFraud360/src/main/java/com/SIH/ZeroFraud360/common/security/SecurityConfig.java)
- Configure stateless session policy (`SessionCreationPolicy.STATELESS`).
- Disable CSRF for stateless Bearer token API.
- Authorization rules:
  - `POST /api/auth/login`, `/actuator/**`, `/error`, `/v3/api-docs/**`, `/swagger-ui/**`: `permitAll()`.
  - `POST /internal/v1/events/**`: `permitAll()` (bank simulation event ingestion).
  - `/api/fraud/**`: `hasAnyRole('POLICE', 'CYBER', 'BANK')`.
  - `/api/officer/**`: `hasAnyRole('POLICE', 'CYBER', 'BANK')`.
  - Any other request: `authenticated()`.
- Add `JwtAuthenticationFilter` before `UsernamePasswordAuthenticationFilter`.

---

### Phase 3: ZeroFraud360 Frontend Login & Protected Interface

#### [NEW] [index.html](file:///d:/Git/ZeroFraud360/Backend/ZeroFraud360/src/main/resources/static/index.html)
- Clean, responsive portal UI with:
  - Login modal for `police`, `cyber`, `bank` with quick-fill demo buttons.
  - Protected Dashboard displaying authenticated user header, live fraud alerts, observed transaction chains, and held accounts.
  - Officer action panel for manual hold release with reason and officer ID.
  - Auto-injection of `Authorization: Bearer <token>` in fetch requests.
  - Automatic session expiration and redirect to login on 401.

---

### Phase 4: IndianBankSimulation Internal Service Authentication

#### [NEW] [InternalServicePrincipal.java](file:///d:/Git/ZeroFraud360/Backend/IndianBankSimulation/src/main/java/com/SIH/IndianBankSimulation/common/security/InternalServicePrincipal.java)
- Represents trusted caller `ZERO_FRAUD_360` with granted authority `ROLE_TRUSTED_SERVICE`.

#### [NEW] [InternalServiceAuthenticationFilter.java](file:///d:/Git/ZeroFraud360/Backend/IndianBankSimulation/src/main/java/com/SIH/IndianBankSimulation/common/security/InternalServiceAuthenticationFilter.java)
- Applies to `/internal/v1/**`.
- Validates `X-Service-Token` against `${BANK_SIMULATION_SERVICE_TOKEN:${bank.security.internal-service-token:sim-secret-token-360}}`.
- On valid token: sets `Authentication` with `InternalServicePrincipal` and `ROLE_TRUSTED_SERVICE` into `SecurityContextHolder`.
- On missing/invalid token: outputs standard error envelope with HTTP 401/403 `INVALID_SERVICE_CREDENTIAL`.

#### [MODIFY] [SecurityConfig.java](file:///d:/Git/ZeroFraud360/Backend/IndianBankSimulation/src/main/java/com/SIH/IndianBankSimulation/common/security/SecurityConfig.java)
- Protect `/internal/v1/**` with `.hasRole("TRUSTED_SERVICE")`.
- Keep customer/simulation APIs (`/api/accounts/**`, `/api/payments/**`, `/api/auth/**`, `/actuator/**`) accessible.
- Add `InternalServiceAuthenticationFilter` before `UsernamePasswordAuthenticationFilter`.

#### [MODIFY] [InternalHoldController.java](file:///d:/Git/ZeroFraud360/Backend/IndianBankSimulation/src/main/java/com/SIH/IndianBankSimulation/hold/controller/InternalHoldController.java)
- Uses authenticated service principal identity `ZERO_FRAUD_360` rather than relying only on manual header checks.

---

### Phase 5 & 6: ZeroFraud360 Service Client & Officer Release Flow

#### [MODIFY] [BankSimulationHoldClient.java](file:///d:/Git/ZeroFraud360/Backend/ZeroFraud360/src/main/java/com/SIH/ZeroFraud360/fraud/hold/client/BankSimulationHoldClient.java)
- Configured via `${BANK_SIMULATION_SERVICE_TOKEN:${bank.sim.service-token:sim-secret-token-360}}`.
- Always passes `X-Service-Token` from configuration.

#### [MODIFY] [OfficerController.java](file:///d:/Git/ZeroFraud360/Backend/ZeroFraud360/src/main/java/com/SIH/ZeroFraud360/fraud/controller/OfficerController.java)
- Injects `@AuthenticationPrincipal UserPrincipal principal` to capture the authenticated officer's username and role.
- Logs structured audit event: `OFFICER_RELEASE_REQUESTED`, `holdId`, `username`, `role`, `timestamp`, `correlationId`.
- Forwards release to `HoldCoordinator`.

---

### Phase 7 & 8: Security Tests & Regression Suite

#### [NEW] [ZeroFraud360SecurityTest.java](file:///d:/Git/ZeroFraud360/Backend/ZeroFraud360/src/test/java/com/SIH/ZeroFraud360/ZeroFraud360SecurityTest.java)
- Tests:
  1. Police login (`police` / `Police@12345`) -> 200 + JWT.
  2. Cyber login (`cyber` / `Cyber@12345`) -> 200 + JWT.
  3. Bank login (`bank` / `Bank@12345`) -> 200 + JWT.
  4. Wrong password -> 401 `INVALID_CREDENTIALS`.
  5. Unknown username -> 401 `INVALID_CREDENTIALS`.
  6. `/api/fraud/alerts` without JWT -> 401 `UNAUTHORIZED`.
  7. `/api/fraud/alerts` with invalid JWT -> 401 `UNAUTHORIZED`.
  8. `/api/fraud/alerts` with police JWT -> 200 OK.
  9. `/api/auth/me` with JWT -> returns current user profile.
  10. Officer release endpoint requires authentication.

#### [NEW] [IndianBankSimulationServiceSecurityTest.java](file:///d:/Git/ZeroFraud360/Backend/IndianBankSimulation/src/test/java/com/SIH/IndianBankSimulation/IndianBankSimulationServiceSecurityTest.java)
- Tests:
  1. Direct frontend call to `/internal/v1/accounts/3000000001/holds` without `X-Service-Token` -> 401/403 `INVALID_SERVICE_CREDENTIAL`.
  2. Call with invalid `X-Service-Token` -> 401/403 `INVALID_SERVICE_CREDENTIAL`.
  3. Call with valid `X-Service-Token` -> 201 Created.
  4. Direct frontend call to `/internal/v1/holds/{id}/release` without token -> 401/403.
  5. Call to `/internal/v1/holds/{id}/release` with valid token -> 200 OK.

#### [NEW] [.env.example](file:///d:/Git/ZeroFraud360/.env.example)
- Configuration template with non-sensitive placeholder values.

---

## Verification Plan

### Automated Tests
1. **IndianBankSimulation**:
   - `IndianBankSimulationServiceSecurityTest` (new security tests)
   - `PaymentAndHoldIntegrationTest` (15 regression tests: transfers, holds, outbox)
   - `AuthIntegrationTest` (customer auth regression)
   - `AccountIntegrationTest` (account queries)
   - Command: `.\mvnw.cmd test` in `Backend/IndianBankSimulation`
2. **ZeroFraud360**:
   - `ZeroFraud360SecurityTest` (new login & JWT security tests)
   - `EndToEndFraudDetectionTest` (full $A \rightarrow B \rightarrow C \le 180\text{s} \rightarrow \text{Decision API} \rightarrow \text{Hold}$ flow)
   - `RapidPassThroughRuleTest` (window & amount unit tests)
   - `EventIngestionIdempotencyTest` (event deduplication)
   - Command: `.\mvnw.cmd test` in `Backend/ZeroFraud360`
