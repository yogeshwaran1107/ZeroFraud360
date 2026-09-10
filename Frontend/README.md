# ZeroFraud360 — Real-Time Fraud Defense & Officer Portal (Frontend)

Modern React + Vite + TypeScript web portal for **ZeroFraud360** — an autonomous money-flow fraud detection and hold enforcement engine running on port `8081`.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Vite Dev Server
```bash
npm run dev
```
The application will launch on `http://localhost:5173`.

> **Note**: Vite is pre-configured with a reverse proxy to forward `/api` and `/internal` requests to `http://localhost:8081` (ZeroFraud360 service).

---

## 👮 Demo Officer Credentials

The portal includes 1-click quick-fill buttons for pre-seeded officer roles:

| Role | Username | Password | Authority | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Police Officer** | `police` | `Police@12345` | `ROLE_POLICE` | Law Enforcement Officer &bull; Monitor alerts & clear holds |
| **Cyber Analyst** | `cyber` | `Cyber@12345` | `ROLE_CYBER` | Cyber Crime Cell &bull; Analyze money-flow chains & release holds |
| **Bank Officer** | `bank` | `Bank@12345` | `ROLE_BANK` | Compliance Officer &bull; Inspect alerts & release holds |

> [!NOTE]
> Accounts automatically lock for 300 seconds after 5 consecutive failed login attempts.

---

## 🛡️ Target Backend APIs (`http://localhost:8081`)

This frontend communicates exclusively with the **ZeroFraud360** service (`zerofraud360_db`):

### Authentication APIs
- `POST /api/auth/login`: Issues HMAC-SHA256 JWT Bearer token valid for 1 hour.
- `GET /api/auth/me`: Current officer profile and permissions.
- `POST /api/auth/logout`: Discards token.

### Fraud Monitoring APIs
- `GET /api/fraud/alerts`: Real-time list of detected fraud alerts, ordered newest first.
- `GET /api/fraud/alerts/{alertId}`: Detailed alert metadata with money-flow chain ($A \rightarrow B \rightarrow C$).
- `GET /api/fraud/transactions`: Observed banking transaction stream.

### Officer Control APIs
- `POST /api/officer/holds/{holdId}/release`: Unlocks held funds on core banking system with mandatory audit logging and clearance reason.

### Event Simulator API
- `POST /internal/v1/events/payment-success`: Ingests durable banking payment events for testing the 3-minute rapid pass-through detector.

---

## ⚡ Built-in Rapid Pass-Through Simulator

Go to the **Mule Simulator** tab in the portal to test the full fraud flow:
1. **Leg 1**: Account A transfers ₹10,000 to Account B.
2. **Leg 2**: Account B transfers ₹10,000 to Account C within $\le 180$ seconds.
3. ZeroFraud360 detects the pattern, queries the decision API (`localhost:xxxx/fraud/verify`), and places an immediate fund hold on Account C!
4. Release the hold as an authenticated officer with one click.
