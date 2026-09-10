# ZeroFraud360 & IndianBankSimulation — Backend API Directory

The backend consists of two decoupled Spring Boot microservices, each with its own independent database, security boundaries, and dedicated API endpoint specification:

---

## 📑 Dedicated API Documentation

| Service | Port | Database | Dedicated Documentation | Description |
| :--- | :--- | :--- | :--- | :--- |
| **IndianBankSimulation** | `8080` | `banksim_db` | 📖 [**`IndianBankSimulation/API_ENDPOINTS.md`**](./IndianBankSimulation/API_ENDPOINTS.md) | Core Banking, Accounts, UPI / IMPS Transfers, Ledgers & Internal Holds |
| **ZeroFraud360** | `8081` | `zerofraud360_db` | 📖 [**`ZeroFraud360/API_ENDPOINTS.md`**](./ZeroFraud360/API_ENDPOINTS.md) | Real-time Money-Flow Fraud Detection, Decision Engine & Officer Case Management |

---

## 1. Quick Comparison & Routing

```text
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND / CLIENT                  │
└──────────────┬───────────────────────────┬──────────────┘
               │                           │
   Customer / Payment APIs        Officer / Alert APIs
   (Port 8080)                    (Port 8081)
               v                           v
┌──────────────────────────────┐ ┌──────────────────────────────┐
│     IndianBankSimulation     │ │         ZeroFraud360         │
│         (Port 8080)          │ │         (Port 8081)          │
│                              │ │                              │
│ • /api/auth/login            │ │ • /api/auth/login            │
│ • /api/auth/register         │ │ • /api/auth/me               │
│ • /api/auth/me               │ │ • /api/auth/logout           │
│ • /api/accounts/me           │ │ • /internal/v1/events/...    │
│ • /api/accounts/me/balance   │ │ • /api/fraud/alerts          │
│ • /api/accounts/{accNumber}  │ │ • /api/fraud/transactions    │
│ • /api/payments/transfer     │ │ • /api/officer/holds/...     │
│ • /internal/v1/holds/...     │ └──────────────┬───────────────┘
└──────────────┬───────────────┘                │
               │                                │
               │     POST /fraud/verify         v
               │                         ┌──────────────┐
               └─────────────────────────┤ External API │
                 POST /internal/v1/holds └──────────────┘
```

---

## 2. Service Profiles & Security Quick Reference

### IndianBankSimulation (`:8080`)
- **API Spec**: [**`IndianBankSimulation/API_ENDPOINTS.md`**](./IndianBankSimulation/API_ENDPOINTS.md)
- **Primary Auth**: Customer JWT Bearer tokens via `Authorization: Bearer <token>`
- **Internal Service Auth**: `X-Service-Token: sim-secret-token-360` (Required for `/internal/v1/**` hold endpoints)
- **Test Users**:
  - `alice` / `Password@123` (`ROLE_CUSTOMER`, Acc: `1000000001`, Bank A)
  - `bob` / `Password@123` (`ROLE_CUSTOMER`, Acc: `2000000001`, Bank B)

### ZeroFraud360 (`:8081`)
- **API Spec**: [**`ZeroFraud360/API_ENDPOINTS.md`**](./ZeroFraud360/API_ENDPOINTS.md)
- **Primary Auth**: Officer JWT Bearer tokens via `Authorization: Bearer <token>`
- **Authorized Roles**: `ROLE_POLICE`, `ROLE_CYBER`, `ROLE_BANK`
- **Test Officers**:
  - `police` / `Police@12345` (`ROLE_POLICE`)
  - `cyber` / `Cyber@12345` (`ROLE_CYBER`)
  - `bank` / `Bank@12345` (`ROLE_BANK`)
