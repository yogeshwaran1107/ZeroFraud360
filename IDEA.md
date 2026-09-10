# Team Zero — Proactive Cyber-Fraud Intervention & Cash-Out Intelligence Platform

## SIH Problem Statement

**Problem Statement ID:** 26184  
**PS Code:** SIH26184  
**Organization:** Ministry of Home Affairs  
**Department:** Indian Cyber Crime Coordination Centre (I4C), CIS Division  
**Category:** Software  
**Theme:** Blockchain & Cybersecurity

---

# 1. Executive Summary

Team Zero proposes an **AI-powered Proactive Cyber-Fraud Intervention & Cash-Out Intelligence Platform** designed to move cyber-fraud response from a primarily reactive model toward proactive prevention.

The core idea is to continuously analyze transaction activity and identify **suspicious multi-hop money-flow patterns** such as:

```text
Account A → Account B → Account C → Account D → Cash Withdrawal
```

Instead of waiting until the money reaches an ATM, the system continuously evaluates the evolving transaction network, detects abnormal behavior, assigns a dynamic risk score, and initiates an appropriate **bank-controlled protective intervention** when the risk becomes sufficiently high.

At the same time, the system communicates relevant intelligence to:

- The affected account holder
- The respective bank/financial institution
- Law-enforcement authorities
- I4C / authorized coordinating personnel

The account holder can be asked to verify whether the activity is legitimate. The bank and authorized agencies can use the generated intelligence to investigate and take action according to their policies and authority.

If the suspicious money flow continues toward cash-out, a second predictive layer forecasts the **most likely withdrawal locations and time window**, satisfying the central predictive objective of SIH26184.

Therefore, the system provides **two lines of defense**:

```text
LINE 1
Detect and interrupt suspicious money movement
                    ↓
LINE 2
Predict likely cash-out location and timing
```

---

# 2. Problem Understanding

The SIH problem focuses on reducing cybercrime through a proactive approach rather than only reacting after fraudulent withdrawals have occurred.

The expected intelligence should help authorities and financial institutions:

- identify potential withdrawal hotspots,
- act before or during a fraudulent cash-out,
- support faster fund blocking,
- share intelligence across relevant jurisdictions,
- and improve the overall response to financial cyber fraud.

The proposed Team Zero solution preserves this objective while adding an earlier intervention stage.

Instead of making the system depend entirely on predicting one exact ATM, Team Zero first tries to identify **suspicious money movement itself**.

---

# 3. Core Idea

## From Reactive Response to Predictive Intervention

A conventional flow can look like:

```text
Fraud happens
    ↓
Complaint
    ↓
Investigation
    ↓
Withdrawal
    ↓
Response
```

Team Zero changes the flow to:

```text
Transaction starts
      ↓
Continuous AI monitoring
      ↓
Suspicious money-flow detection
      ↓
Risk assessment
      ↓
Protective intervention
      ↓
Account-holder verification
      ↓
Bank + LEA intelligence sharing
      ↓
If flow continues:
Cash-out prediction
      ↓
Likely location + time window
      ↓
Proactive intervention
```

The objective is not to label every unusual transaction as fraud.

The objective is to identify **high-risk patterns early enough to create an opportunity for prevention**.

---

# 4. Why Multi-Hop Money Flow Matters

A fraudulent amount may not move directly from one account to a final cash-out account.

A possible flow is:

```text
Victim
  ↓
Account A
  ↓
Account B
  ↓
Account C
  ↓
Account D
  ↓
Cash Withdrawal
```

Money may also split:

```text
Account C
   ├──→ Account D
   ├──→ Account E
   └──→ Account F
```

Looking at transactions individually can hide the broader pattern.

Team Zero therefore represents related accounts and transactions as a **dynamic fraud/transaction graph**.

This lets the system study:

- money-flow paths,
- transaction velocity,
- transaction frequency,
- unusual movement between accounts,
- relationship patterns,
- links to previously suspicious entities,
- temporal behavior,
- geospatial behavior,
- and other signals available to the participating financial institution.

---

# 5. Transaction Intelligence Graph

The platform maintains a graph representation of relevant entities.

Example:

```text
                         ┌─────────────┐
                         │   Victim    │
                         └──────┬──────┘
                                │
                              ₹2L
                                │
                                ▼
                         ┌─────────────┐
                         │  Account A  │
                         └──────┬──────┘
                                │
                                ▼
                         ┌─────────────┐
                         │  Account B  │
                         └──────┬──────┘
                                │
                                ▼
                         ┌─────────────┐
                         │  Account C  │
                         └───┬────┬────┘
                             │    │
                           ₹60K  ₹50K
                             │    │
                             ▼    ▼
                         Account D Account E
                             │
                             ▼
                       Cash Withdrawal
```

The graph can contain nodes such as:

- Accounts
- Transactions
- UPI identifiers
- Phone identifiers
- Beneficiaries
- ATMs
- Locations
- Related cases

The exact entities and data available will depend on the authorized data sources.

---

# 6. Continuous AI Monitoring

When a transaction occurs, the system should not immediately declare it fraudulent.

Instead, the transaction enters a **continuous risk-analysis pipeline**.

```text
New Transaction
      ↓
Update Transaction Graph
      ↓
Analyze Current Behavior
      ↓
Check Historical/Contextual Signals
      ↓
Calculate Risk
      ↓
Monitor / Verify / Intervene
```

A single high-value transfer may be legitimate.

A sequence such as:

```text
A → B → C → D → E
```

within an unusual time period may be significantly more suspicious when combined with other risk signals.

The system therefore evaluates the **overall behavior**, not one transaction in isolation.

---

# 7. Dynamic Risk Scoring

Team Zero should use a risk score instead of an unconditional fraud label.

A conceptual model is:

```text
Transaction Signals
        +
Network / Graph Signals
        +
Historical Behavior
        +
Temporal Signals
        +
Geospatial Signals
        +
Recent Activity
        ↓
AI Risk Engine
        ↓
Risk Score
```

Example conceptual levels:

```text
0 – 30    → Low Risk
31 – 60   → Monitor
61 – 80   → Verification / Enhanced Monitoring
81 – 100  → High / Critical Risk
```

These thresholds are examples for the prototype and should be validated rather than treated as fixed policy.

---

# 8. Risk-Based Actions

The action should depend on the risk level.

## Low Risk

```text
Transaction
    ↓
Normal processing
    ↓
Passive monitoring
```

## Medium Risk

```text
Transaction
    ↓
Enhanced monitoring
    ↓
Additional contextual analysis
```

## High Risk

```text
High-Risk Activity
        ↓
Bank-controlled protective intervention
        ↓
Account-holder verification
        ↓
LEA / Bank intelligence alert
```

## Critical Risk

```text
Critical Activity
        ↓
Immediate escalation
        ↓
Protective financial controls
        ↓
LEA / Bank / I4C workflow
```

The platform should generate a **risk recommendation and intelligence signal**; actual account freezes, transaction holds, or other regulated actions should remain under the authority and policies of the relevant financial institution and authorized agencies.

---

# 9. Account-Holder Verification

When high-risk activity is detected, the account holder receives a clear verification request.

Example:

```text
┌──────────────────────────────────────────────┐
│       SUSPICIOUS ACTIVITY DETECTED          │
├──────────────────────────────────────────────┤
│ We detected unusual movement of funds       │
│ associated with your account.               │
│                                              │
│ Recent flow:                                 │
│ Account A → B → C → D                       │
│                                              │
│ Amount involved: ₹1,80,000                   │
│                                              │
│ Did you authorize this activity?             │
│                                              │
│      [ YES, I AUTHORIZED IT ]               │
│      [ NO, THIS IS FRAUD ]                  │
└──────────────────────────────────────────────┘
```

The user's response becomes **one input to the decision process**, not necessarily the only input.

This is important because a compromised account or device could itself be controlled by an attacker.

---

# 10. Multi-Party Intelligence Sharing

The system should generate different intelligence views for different stakeholders.

## Account Holder

Purpose:

- confirm legitimate activity,
- report suspected fraud,
- understand why verification was requested.

Example:

```text
Suspicious transaction detected.
Did you authorize this activity?
```

## Bank / Financial Institution

Purpose:

- identify high-risk accounts,
- review suspicious transaction chains,
- apply authorized protective controls,
- support fund-blocking workflows.

Example:

```text
High-risk multi-hop transaction pattern detected.

Risk Score: 88
Linked Accounts: 5
Active Transfers: 4
Current Status: Protective Review
```

## Law Enforcement

Purpose:

- investigate suspicious money flows,
- identify connected accounts,
- understand the transaction graph,
- receive actionable case intelligence.

Example:

```text
Potential Fraud Network

Linked Cases: 3
Linked Accounts: 5
Total Flow: ₹4,20,000
High-Risk Path: A → B → C → D
Current Risk: High
```

## I4C / Coordinating Authorities

Purpose:

- aggregate intelligence,
- identify broader fraud patterns,
- coordinate action across jurisdictions,
- monitor emerging risk.

---

# 11. The One-Hour Security Concept

A temporary security window can be used as a prototype concept.

Instead of treating one hour as a universal rule, Team Zero should implement an **adaptive protective window**.

Conceptually:

```text
Medium Risk    → Short protective review
High Risk      → Longer protective review
Critical Risk  → Immediate escalation / stronger control
```

For example, a prototype could simulate:

```text
Medium   → 10 minutes
High     → 30 minutes
Critical → 60 minutes
```

These values are examples only and should not be presented as an actual banking policy.

The core concept is:

> **Create a temporary security window that gives the account holder, bank and authorized investigators time to verify suspicious activity before a potentially irreversible cash-out occurs.**

---

# 12. The Cash-Out Prediction Layer

The original SIH problem specifically requires prediction of likely cash-withdrawal locations.

Team Zero therefore retains a dedicated **Cash-Out Intelligence Engine**.

If the suspicious money flow continues:

```text
Account A → B → C
         ↓
   Cash-Out Prediction
         ↓
Likely withdrawal areas
         ↓
ATM / cash-out candidates
         ↓
Probability + time window
```

The system should not claim:

> "The fraudster will definitely use ATM X."

Instead, it should rank candidate locations by probability.

Example:

```text
Top Predicted Cash-Out Locations

1. ATM Cluster A    24%
2. ATM Cluster B    15%
3. ATM Cluster C    11%
4. ATM Cluster D     7%
5. ATM Cluster E     6%
```

This is more realistic because a person may have multiple possible withdrawal points.

---

# 13. Hierarchical Cash-Out Prediction

Rather than trying to predict one exact ATM immediately, Team Zero can use hierarchical prediction.

```text
Level 1
Which region / district?
        ↓
Level 2
Which ATM cluster / locality?
        ↓
Level 3
Which individual ATM?
        ↓
Level 4
What time window?
```

Example:

```text
Predicted Region:
Central Chennai

Predicted ATM Cluster:
Cluster A

Top ATM Candidate:
ATM-102

Estimated Window:
Next 30–60 minutes
```

This creates a more practical and probabilistic prediction model.

---

# 14. Explainable AI

The system should explain **why** a location or transaction received a high risk score.

Instead of:

```text
ATM-102
Risk = 86%
```

the dashboard should show:

```text
ATM-102
Risk Level: High

Contributing Signals:

✓ Similar historical cash-out pattern
✓ Strong relationship to the active transaction network
✓ Geographic proximity
✓ Matching temporal behavior
✓ Recent suspicious activity
```

Likewise, for a transaction risk:

```text
Account C
Risk Score: 88

Reasons:

✓ Rapid multi-hop fund movement
✓ Unusual transaction velocity
✓ Connected to multiple accounts
✓ Pattern resembles previous suspicious flows
✓ Current behavior deviates from normal account activity
```

Explainability is important because investigators need **evidence and context**, not just a number.

---

# 15. Dynamic Risk Propagation

Risk should change as new events arrive.

Example:

```text
Initial State

ATM A → 45%
ATM B → 40%
ATM C → 25%
```

A new related transaction appears:

```text
ATM A → 68%
ATM B → 48%
ATM C → 29%
```

Another related event occurs:

```text
ATM A → 78%
ATM B → 51%
ATM C → 31%
```

This creates a **live intelligence system** rather than a static historical heatmap.

---

# 16. Two-Line Defense Architecture

The strongest conceptual part of Team Zero is the two-stage defense.

## Defense Line 1 — Stop Suspicious Money Movement

```text
Live Transaction
      ↓
AI Monitoring
      ↓
Transaction Graph
      ↓
Risk Detection
      ↓
Protective Intervention
      ↓
Verification + Investigation
```

## Defense Line 2 — Predict Cash-Out

```text
Suspicious Money Flow Continues
              ↓
      Cash-Out Prediction
              ↓
   Likely Location + Time
              ↓
    Proactive Intervention
```

Therefore:

```text
             CYBER-FRAUD ACTIVITY
                     │
                     ▼
            ┌─────────────────┐
            │  AI MONITORING  │
            └────────┬────────┘
                     │
                     ▼
             SUSPICIOUS FLOW?
                /         \
              NO           YES
              │             │
              ▼             ▼
           Continue    Risk Assessment
                            │
                            ▼
                   Protective Action
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
             Verified              Continues
              Fraud                    │
                │                      ▼
                ▼               Cash-Out Prediction
         Bank + LEA Action              │
                                       ▼
                              Location + Time Risk
                                       │
                                       ▼
                              Proactive Intervention
```

---

# 17. Closed-Loop Learning

After an incident is resolved, the actual outcome should be recorded.

Example:

```text
Prediction:
ATM Cluster A

Actual:
ATM Cluster B
```

The system can compare:

```text
Prediction
    ↓
Actual Outcome
    ↓
Error Analysis
    ↓
Model Feedback
    ↓
Improved Future Predictions
```

This gives Team Zero a **closed-loop intelligence architecture**.

The goal is for the model to continuously improve as more validated cases become available.

---

# 18. Risk Heatmap Dashboard

The SIH problem requires a GIS-enabled risk visualization.

Team Zero can provide a live map showing:

```text
🔴 Critical Risk
🟠 High Risk
🟡 Medium Risk
🟢 Low Risk
```

Clicking a hotspot should expose intelligence such as:

```text
ATM / Location: ATM-102

Risk: High
Probability: 24%
Expected Window: 30–60 minutes

Linked Cases: 3
Linked Accounts: 5
Recent Related Transactions: 7

Why High Risk?
- Historical similarity
- Transaction-network relationship
- Geographic proximity
- Time-pattern match
```

---

# 19. Law-Enforcement Intelligence View

An investigator should be able to move from:

```text
Risk Alert
    ↓
Transaction
    ↓
Account
    ↓
Related Accounts
    ↓
Transaction Graph
    ↓
Cash-Out Prediction
    ↓
Evidence / Explanation
```

The investigator should not have to manually reconstruct the complete network from separate transaction records.

---

# 20. Suggested System Modules

## A. Transaction Ingestion Service

Receives authorized transaction events/data.

## B. Transaction Normalization Engine

Cleans and standardizes incoming records.

## C. Entity Resolution Engine

Identifies relationships among accounts, transactions and other authorized entities.

## D. Fraud / Transaction Graph Engine

Builds and updates the live transaction graph.

## E. AI Risk Engine

Calculates dynamic transaction/account/network risk.

## F. Behavioral Anomaly Engine

Identifies unusual movement patterns.

## G. Cash-Out Prediction Engine

Predicts probable cash-withdrawal areas, ATM clusters, candidate ATMs and time windows.

## H. Explainability Engine

Generates human-readable reasons behind risk scores and predictions.

## I. Alert & Notification Service

Routes intelligence to authorized stakeholders.

## J. Case / Investigation Management

Allows investigators to review alerts, connected entities, evidence and actions.

## K. GIS Intelligence Dashboard

Visualizes risk geographically.

## L. Feedback & Model Evaluation Engine

Compares predictions with actual outcomes.

---

# 21. High-Level Technical Architecture

```text
                    DATA SOURCES
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Transactions    Complaints      Location / ATM
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                DATA INGESTION LAYER
                         │
                         ▼
             DATA PROCESSING / CLEANING
                         │
                         ▼
               ENTITY RESOLUTION
                         │
                         ▼
              TRANSACTION GRAPH
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
      BEHAVIOR ENGINE         GEO/TIME ENGINE
             │                       │
             └───────────┬───────────┘
                         ▼
                  AI RISK ENGINE
                         │
             ┌───────────┴────────────┐
             ▼                        ▼
    PROTECTIVE INTERVENTION     CASH-OUT PREDICTION
             │                        │
             │                 Location + Time
             │                        │
             └───────────┬────────────┘
                         ▼
               EXPLAINABILITY ENGINE
                         │
                         ▼
              INTELLIGENCE / ALERTS
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ACCOUNT HOLDER     BANK / FI       LEA / I4C
                         │
                         ▼
                  ACTION / REVIEW
                         │
                         ▼
                 OUTCOME FEEDBACK
                         │
                         ▼
                    MODEL UPDATE
```

---

# 22. Example End-to-End Scenario

Assume:

```text
Victim transfers ₹2,00,000
        ↓
Account A
        ↓
Account B
        ↓
Account C
```

The system detects:

```text
Rapid fund movement
+
Multiple intermediary accounts
+
Unusual transaction velocity
+
Suspicious behavioral pattern
```

The risk engine produces:

```text
Risk Score: 88
Risk Level: High
```

The platform then:

```text
1. Generates a high-risk alert.
2. Requests account-holder verification.
3. Sends intelligence to the relevant bank/FI.
4. Sends authorized intelligence to law enforcement.
5. Applies or recommends a bank-controlled protective action.
```

If the flow continues toward cash-out:

```text
Cash-Out Prediction

Region: Central Chennai
ATM Cluster A: 24%
ATM Cluster B: 15%
ATM Cluster C: 11%
Expected Window: Next 30–60 min
```

The responsible teams can then prioritize intervention around the highest-risk candidates.

Finally:

```text
Actual Outcome
      ↓
Prediction Evaluation
      ↓
Feedback
      ↓
Model Improvement
```

---

# 23. Innovation Compared with a Basic SIH Interpretation

A basic implementation could be:

```text
Historical Data
      ↓
ML Model
      ↓
Risk Heatmap
      ↓
Alert
```

Team Zero's proposed architecture is:

```text
Live Transaction
      ↓
Continuous Monitoring
      ↓
Fraud Transaction Graph
      ↓
Behavioral Risk Analysis
      ↓
Early Protective Intervention
      ↓
Account-Holder Verification
      ↓
Bank + LEA Intelligence
      ↓
Cash-Out Prediction
      ↓
Location + Time Ranking
      ↓
Explainable Actionable Intelligence
      ↓
Outcome Feedback
      ↓
Model Improvement
```

The key innovation is therefore **not simply predicting ATMs**.

It is combining:

> **early detection + transaction-network intelligence + protective intervention + cash-out prediction + explainability + closed-loop learning**

into one proactive system.

---

# 24. Important Design Principle

The system should never be presented as a machine that can know with certainty that a transaction is fraudulent or that a specific ATM will definitely be used.

Instead:

```text
AI
  ↓
Risk Assessment
  ↓
Probability / Confidence
  ↓
Recommended Action
```

The final regulated decision remains with the authorized financial institution and law-enforcement workflow.

This makes the platform more realistic, explainable and responsible.

---

# 25. Final Team Zero Solution Statement

> **Team Zero proposes an AI-powered Proactive Cyber-Fraud Intervention & Cash-Out Intelligence Platform that continuously analyzes transaction behavior and dynamic money-flow networks to detect suspicious multi-hop fund movement at an early stage. The platform generates dynamic risk scores, initiates bank-controlled protective interventions, requests account-holder verification, and shares actionable intelligence with authorized financial institutions and law-enforcement agencies. If suspicious funds continue toward cash-out, a dedicated predictive engine forecasts the most probable withdrawal locations and time windows, enabling proactive intervention before or during the cash-out stage.**

---

# 26. Core Value Proposition

```text
                    DETECT EARLIER
                         ↓
                  UNDERSTAND BETTER
                         ↓
                   INTERVENE FASTER
                         ↓
                  PREDICT CASH-OUT
                         ↓
                 PREVENT / MITIGATE
```

### Team Zero's goal:

> **Don't wait for the cash withdrawal to happen. Detect the suspicious money flow early, create a security window for intervention, and predict the likely cash-out when the fraud continues.**

---

# 27. Project Identity

## Team Zero

### **Detect. Interrupt. Predict. Prevent.**

**Detect** suspicious money movement.  
**Interrupt** high-risk activity through authorized protective workflows.  
**Predict** likely cash-out locations and timing.  
**Prevent** or reduce the impact of financial cyber fraud through proactive intelligence.

---

## Source Alignment

This concept is designed around the uploaded SIH26184 problem statement, whose core objective is to develop predictive intelligence for likely cash-withdrawal locations and enable proactive cybercrime intervention. The SIH deliverables include predictive analytics, GIS-based risk visualization, a law-enforcement interface, and alert/notification capabilities.

**Source:** SIH Problem Statement SIH26184 — Ministry of Home Affairs / I4C.
