# ZeroFraud360 & IndianBankSimulation — Backend Services

This directory contains the Spring Boot backend microservices for the **ZeroFraud360 Real-Time Fraud Detection Engine** and the **Indian Banking & Payment-System Simulation**.

---

## 📖 API Documentation

For the complete, comprehensive REST API specification, request/response JSON schemas, headers, error codes, and curl examples across both services, see:

👉 **[`API_ENDPOINTS.md`](./API_ENDPOINTS.md)**

---

## 🏗️ Microservices

1. **[`IndianBankSimulation/`](./IndianBankSimulation/)** (Port `8080`)
   - Core Banking ledger simulation (Alice vs. Bob)
   - Account balances, UPI PIN authorization, and inter-bank transfers
   - Financial-control internal hold APIs (`POST /internal/v1/accounts/{id}/holds`)
   - Documentation: [`IndianBankSimulation/README.md`](./IndianBankSimulation/README.md)

2. **[`ZeroFraud360/`](./ZeroFraud360/)** (Port `8081`)
   - Real-time event ingestion (`POST /internal/v1/events/payment-success`)
   - Money-flow anomaly detection ($A \rightarrow B \rightarrow C \le 3\text{ min}$)
   - External ML / rule decision verification client
   - Automated account hold triggering and multi-role officer portal (`police`, `cyber`, `bank`)
   - Documentation: [`ZeroFraud360/README.md`](./ZeroFraud360/README.md)

