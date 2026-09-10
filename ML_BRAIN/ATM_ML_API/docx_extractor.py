"""Extractor and Dataset Synthesizer for ATM & Cash Withdrawal Fraud Detection.

This module:
1. Parses 'withdrawal methods.docx' from the user's training data directory to extract
   customer baseline withdrawal channel usage distributions (ATM, Bank Branch, Post Office AePS, BC/CSP AePS).
2. Integrates withdrawal fraud patterns from 'updated dataset-1.0.docx' (Cash-Out Burst,
   Cash-Digital Combination, Impossible Travel, Channel Deviation, Biometric Spoofing).
3. Synthesizes a production-grade 50,000-row realistic training dataset ('atm_withdrawal_dataset.csv').
"""

from __future__ import annotations

import json
import logging
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("atm_docx_extractor")

LOCAL_DIR = Path(__file__).resolve().parent

WITHDRAWAL_DOCX = LOCAL_DIR / "withdrawal methods.docx"
PATTERNS_DOCX = LOCAL_DIR / "updated dataset-1.0.docx"
LEGACY_PATTERNS_DOCX = LOCAL_DIR / "dataset-1.docx"

OUTPUT_CSV_LOCAL = LOCAL_DIR / "atm_withdrawal_dataset.csv"

# Canonical channels identified from customer profiles
CANONICAL_CHANNELS = ["ATM", "Bank Branch", "Post Office AePS", "BC/CSP AePS"]


def extract_withdrawal_methods(docx_path: Path | None = None) -> list[dict[str, Any]]:
    """Extracts customer profile withdrawal distributions from 'withdrawal methods.docx'.

    Args:
        docx_path: Optional explicit path to the docx file.

    Returns:
        List of customer dicts with name, account_id, aadhaar_id, and channel distributions.
    """
    path = docx_path or WITHDRAWAL_DOCX
    if not path.is_file():
        logger.warning("'%s' not found. Using internal fallback customer profiles.", path)
        return _get_fallback_customer_profiles()

    logger.info("Extracting customer baseline profiles from '%s'...", path)
    with zipfile.ZipFile(path) as z:
        xml_content = z.read("word/document.xml")

    root = ET.fromstring(xml_content)
    namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    tables = root.findall(".//w:tbl", namespaces)

    if not tables:
        logger.warning("No tables found in docx. Using fallback profiles.")
        return _get_fallback_customer_profiles()

    profiles: list[dict[str, Any]] = []
    rows = tables[0].findall(".//w:tr", namespaces)

    for r_idx in range(1, len(rows)):
        cells = rows[r_idx].findall(".//w:tc", namespaces)
        texts = [" ".join([t.text for t in c.findall(".//w:t", namespaces) if t.text]).strip() for c in cells]
        if len(texts) >= 4:
            name, acc_id, aadh_id, usage_str = texts[0], texts[1], texts[2], texts[3]
            dist = _parse_usage_string(usage_str)
            profiles.append({
                "name": name,
                "account_id": acc_id,
                "aadhaar_id": aadh_id,
                "channel_distribution": dist,
                "raw_usage": usage_str,
            })

    logger.info("Extracted %d customer baseline profiles successfully.", len(profiles))
    return profiles


def _parse_usage_string(usage_str: str) -> dict[str, float]:
    """Parses percentage distribution strings like 'ATM – 60% – Bank Branch – 40%' or with unicode separators."""
    dist = {ch: 0.0 for ch in CANONICAL_CHANNELS}
    # Pattern: Match channel identifier, followed by any non-digit chars, followed by digits and '%'
    pattern = r"(ATM|Bank\s*Branch|Post\s*Office\s*AePS|BC\s*/\s*CSP\s*AePS)[^\d%]*?(\d+)%"
    matches = re.findall(pattern, usage_str, re.IGNORECASE)
    for channel_raw, pct_raw in matches:
        pct = float(pct_raw) / 100.0
        c_clean = re.sub(r"\s+", " ", channel_raw).strip()
        for canon in CANONICAL_CHANNELS:
            # Match canonical by key tokens
            if "atm" in c_clean.lower() and canon == "ATM":
                dist[canon] = pct
                break
            elif "branch" in c_clean.lower() and canon == "Bank Branch":
                dist[canon] = pct
                break
            elif "post" in c_clean.lower() and canon == "Post Office AePS":
                dist[canon] = pct
                break
            elif "bc" in c_clean.lower() or "csp" in c_clean.lower():
                if canon == "BC/CSP AePS":
                    dist[canon] = pct
                    break
    return dist


def _get_fallback_customer_profiles() -> list[dict[str, Any]]:
    """Hardcoded fallback representing exact data from withdrawal methods.docx."""
    return [
        {"name": "Arun Kumar", "account_id": "ACC1001", "aadhaar_id": "AADH2001", "channel_distribution": {"ATM": 0.60, "Bank Branch": 0.40, "Post Office AePS": 0.0, "BC/CSP AePS": 0.0}},
        {"name": "Bala Kumar", "account_id": "ACC1002", "aadhaar_id": "AADH2002", "channel_distribution": {"ATM": 0.50, "Bank Branch": 0.0, "Post Office AePS": 0.50, "BC/CSP AePS": 0.0}},
        {"name": "Karthik Raj", "account_id": "ACC1003", "aadhaar_id": "AADH2003", "channel_distribution": {"ATM": 0.55, "Bank Branch": 0.0, "Post Office AePS": 0.0, "BC/CSP AePS": 0.45}},
        {"name": "Dinesh Kumar", "account_id": "ACC1004", "aadhaar_id": "AADH2004", "channel_distribution": {"ATM": 0.0, "Bank Branch": 0.65, "Post Office AePS": 0.35, "BC/CSP AePS": 0.0}},
        {"name": "Gokul Raj", "account_id": "ACC1005", "aadhaar_id": "AADH2005", "channel_distribution": {"ATM": 0.0, "Bank Branch": 0.40, "Post Office AePS": 0.0, "BC/CSP AePS": 0.60}},
        {"name": "Hari Prasad", "account_id": "ACC1006", "aadhaar_id": "AADH2006", "channel_distribution": {"ATM": 0.0, "Bank Branch": 0.0, "Post Office AePS": 0.70, "BC/CSP AePS": 0.30}},
        {"name": "Manoj Kumar", "account_id": "ACC1007", "aadhaar_id": "AADH2007", "channel_distribution": {"ATM": 0.45, "Bank Branch": 0.35, "Post Office AePS": 0.20, "BC/CSP AePS": 0.0}},
        {"name": "Naveen Raj", "account_id": "ACC1008", "aadhaar_id": "AADH2008", "channel_distribution": {"ATM": 0.50, "Bank Branch": 0.20, "Post Office AePS": 0.0, "BC/CSP AePS": 0.30}},
        {"name": "Praveen Kumar", "account_id": "ACC1009", "aadhaar_id": "AADH2009", "channel_distribution": {"ATM": 0.30, "Bank Branch": 0.0, "Post Office AePS": 0.40, "BC/CSP AePS": 0.30}},
        {"name": "Santhosh Kumar", "account_id": "ACC1010", "aadhaar_id": "AADH2010", "channel_distribution": {"ATM": 0.0, "Bank Branch": 0.30, "Post Office AePS": 0.25, "BC/CSP AePS": 0.45}},
    ]


def synthesize_atm_dataset(
    n_samples: int = 50_000,
    fraud_rate: float = 0.015,
    random_state: int = 42,
    docx_path: Path | None = None,
) -> pd.DataFrame:
    """Synthesizes high-fidelity ATM/cash withdrawal dataset modeled after domain profiles.

    Args:
        n_samples: Total number of rows to generate (default: 50,000).
        fraud_rate: Fraud incidence proportion (default: 0.015 -> 1.5%).
        random_state: Seed for deterministic sampling.
        docx_path: Optional path to 'withdrawal methods.docx'.

    Returns:
        Clean DataFrame ready for model training.
    """
    profiles = extract_withdrawal_methods(docx_path)
    rng = np.random.default_rng(random_state)

    n_fraud = int(round(n_samples * fraud_rate))
    n_legit = n_samples - n_fraud

    logger.info(
        "Synthesizing %d ATM/Cash transactions (%d legit, %d fraud ~ %.2f%%)...",
        n_samples,
        n_legit,
        n_fraud,
        fraud_rate * 100,
    )

    # --- 1. Synthesize Legitimate Transactions ---
    legit_records: list[dict[str, Any]] = []
    for _ in range(n_legit):
        prof = rng.choice(profiles)
        dist = prof["channel_distribution"]
        # Filter channels with > 0 probability
        valid_channels = [c for c, p in dist.items() if p > 0]
        probs = [dist[c] for c in valid_channels]
        total_p = sum(probs)
        norm_probs = [p / total_p for p in probs]

        selected_channel = rng.choice(valid_channels, p=norm_probs)
        channel_usage_pct = dist.get(selected_channel, 0.0)

        # Baseline channel deviation is minimal (0.0 to 0.05)
        channel_dev = float(np.clip(1.0 - channel_usage_pct, 0.0, 0.6)) * rng.uniform(0.0, 0.15)

        # Amount: log-normal everyday cash withdrawal (median ~₹2,500, max typical ₹15,000)
        # Multiples of 100 or 500 like real ATMs
        raw_amt = rng.lognormal(mean=7.7, sigma=0.65)
        raw_amt = np.clip(raw_amt, a_min=100.0, a_max=25000.0)
        # Round to nearest 100
        amount = float(round(raw_amt / 100.0) * 100)
        if amount < 100.0:
            amount = 100.0

        # Customer's typical average is around ₹2,500 - ₹4,000
        avg_amt = rng.uniform(2000.0, 4500.0)
        amt_ratio = round(amount / avg_amt, 2)

        # Pacing: low velocity
        vel_10m = int(rng.poisson(lam=0.03))
        vel_24h = int(rng.poisson(lam=0.8)) + vel_10m

        # Distance: local neighborhood ATMs / branches (median ~2.5 km)
        dist_km = float(np.clip(rng.exponential(scale=3.2), a_min=0.1, a_max=45.0))

        # Off hours: very low probability at night (23:00 - 05:00)
        is_off_hours = int(rng.binomial(n=1, p=0.03))

        # Auth failures: very rare (0 most times, rarely 1)
        failed_auth = int(rng.binomial(n=1, p=0.02))

        legit_records.append({
            "withdrawal_amount": round(amount, 2),
            "channel_deviation_score": round(channel_dev, 4),
            "velocity_10m": vel_10m,
            "velocity_24h": vel_24h,
            "distance_from_last_terminal_km": round(dist_km, 2),
            "is_off_hours": is_off_hours,
            "failed_auth_attempts": failed_auth,
            "amount_to_avg_ratio": amt_ratio,
            "pattern_name": "Normal Baseline Cash Withdrawal",
            "is_fraud": 0,
        })

    # --- 2. Synthesize Fraudulent Transactions across 6 Attack Vectors ---
    fraud_records: list[dict[str, Any]] = []
    vector_weights = [0.25, 0.25, 0.15, 0.15, 0.10, 0.10]

    for _ in range(n_fraud):
        vector = rng.choice([1, 2, 3, 4, 5, 6], p=vector_weights)
        prof = rng.choice(profiles)
        dist = prof["channel_distribution"]

        if vector == 1:
            # VECTOR 1: Channel Deviation Anomaly
            # An account that never uses ATM (0% ATM baseline) suddenly has a large ATM cash-out
            zero_channels = [c for c, p in dist.items() if p == 0.0]
            if not zero_channels:
                zero_channels = [min(dist, key=dist.get)]
            attack_channel = rng.choice(zero_channels)
            channel_dev = float(rng.uniform(0.85, 1.0))
            amount = float(round(rng.uniform(10000.0, 40000.0) / 500.0) * 500)
            avg_amt = rng.uniform(1500.0, 3000.0)
            amt_ratio = round(amount / avg_amt, 2)
            vel_10m = int(rng.poisson(lam=1.5)) + 1
            vel_24h = int(rng.poisson(lam=4.0)) + vel_10m
            dist_km = float(rng.uniform(15.0, 180.0))
            is_off_hours = int(rng.binomial(n=1, p=0.45))
            failed_auth = int(rng.binomial(n=1, p=0.35))
            pat_name = "Sudden Unused Channel Exploitation"

        elif vector == 2:
            # VECTOR 2: Cash-Out Burst / Rapid ATM Draining (Pattern 39/40)
            # Rapid back-to-back maximal withdrawals at the daily switch limit
            channel_dev = float(rng.uniform(0.30, 0.85))
            amount = float(round(rng.uniform(20000.0, 50000.0) / 1000.0) * 1000)
            avg_amt = rng.uniform(2000.0, 3500.0)
            amt_ratio = round(amount / avg_amt, 2)
            vel_10m = int(rng.poisson(lam=3.5)) + 2  # 3-6 txns in 10 mins
            vel_24h = int(rng.poisson(lam=8.0)) + vel_10m
            dist_km = float(rng.uniform(5.0, 60.0))
            is_off_hours = int(rng.binomial(n=1, p=0.50))
            failed_auth = int(rng.poisson(lam=0.8))
            pat_name = "Cash-Out Burst / Rapid Draining (Pattern 39/40)"

        elif vector == 3:
            # VECTOR 3: Terminal Impossible Travel / Remote ATM Clone (Pattern 36)
            # Cloned card swiped at distant terminal shortly after local activity
            channel_dev = float(rng.uniform(0.20, 0.75))
            amount = float(round(rng.uniform(5000.0, 35000.0) / 500.0) * 500)
            avg_amt = rng.uniform(2500.0, 4000.0)
            amt_ratio = round(amount / avg_amt, 2)
            vel_10m = int(rng.poisson(lam=1.2)) + 1
            vel_24h = int(rng.poisson(lam=3.5)) + vel_10m
            dist_km = float(rng.uniform(350.0, 2200.0))  # Impossible travel distance
            is_off_hours = int(rng.binomial(n=1, p=0.60))
            failed_auth = int(rng.binomial(n=1, p=0.40))
            pat_name = "Terminal Impossible Travel / Cloned Card"

        elif vector == 4:
            # VECTOR 4: Nocturnal ATM Cash-Out with Prior PIN Failures
            # Attackers guessing or brute-forcing ATM PIN at 2 AM
            channel_dev = float(rng.uniform(0.25, 0.70))
            amount = float(round(rng.uniform(8000.0, 30000.0) / 500.0) * 500)
            avg_amt = rng.uniform(2000.0, 3500.0)
            amt_ratio = round(amount / avg_amt, 2)
            vel_10m = int(rng.poisson(lam=2.0)) + 1
            vel_24h = int(rng.poisson(lam=5.0)) + vel_10m
            dist_km = float(rng.uniform(8.0, 85.0))
            is_off_hours = 1  # Guaranteed nocturnal
            failed_auth = int(rng.choice([2, 3, 4]))  # Multiple failed PINs
            pat_name = "Nocturnal ATM Cash-Out with PIN Failures"

        elif vector == 5:
            # VECTOR 5: Digital Inflow Followed Immediately by Cash-Out (Pattern 61/62)
            # Large digital influx swiftly drained via ATM/AePS
            channel_dev = float(rng.uniform(0.40, 0.90))
            amount = float(round(rng.uniform(35000.0, 80000.0) / 1000.0) * 1000)
            avg_amt = rng.uniform(2000.0, 3500.0)
            amt_ratio = round(amount / avg_amt, 2)
            vel_10m = int(rng.poisson(lam=3.0)) + 2
            vel_24h = int(rng.poisson(lam=10.0)) + vel_10m
            dist_km = float(rng.uniform(10.0, 95.0))
            is_off_hours = int(rng.binomial(n=1, p=0.35))
            failed_auth = int(rng.binomial(n=1, p=0.20))
            pat_name = "Cash-Digital Combination Drain (Pattern 61/62)"

        else:
            # VECTOR 6: Suspicious BC/CSP AePS Biometric Spike / Rogue Micro-ATM
            channel_dev = float(rng.uniform(0.60, 1.0))
            amount = float(round(rng.uniform(10000.0, 30000.0) / 500.0) * 500)
            avg_amt = rng.uniform(1500.0, 3000.0)
            amt_ratio = round(amount / avg_amt, 2)
            vel_10m = int(rng.poisson(lam=2.5)) + 1
            vel_24h = int(rng.poisson(lam=6.0)) + vel_10m
            dist_km = float(rng.uniform(25.0, 300.0))
            is_off_hours = int(rng.binomial(n=1, p=0.40))
            failed_auth = int(rng.choice([1, 2, 3]))
            pat_name = "AePS Biometric Spoof / Rogue Micro-ATM"

        fraud_records.append({
            "withdrawal_amount": round(amount, 2),
            "channel_deviation_score": round(channel_dev, 4),
            "velocity_10m": vel_10m,
            "velocity_24h": vel_24h,
            "distance_from_last_terminal_km": round(dist_km, 2),
            "is_off_hours": is_off_hours,
            "failed_auth_attempts": failed_auth,
            "amount_to_avg_ratio": amt_ratio,
            "pattern_name": pat_name,
            "is_fraud": 1,
        })

    df = pd.concat([pd.DataFrame(legit_records), pd.DataFrame(fraud_records)], ignore_index=True)
    df = df.sample(frac=1.0, random_state=random_state).reset_index(drop=True)

    actual_fraud_pct = df["is_fraud"].mean() * 100
    logger.info(
        "Generated %d total transactions. Actual fraud rate: %.2f%% (%d fraud cases).",
        len(df),
        actual_fraud_pct,
        df["is_fraud"].sum(),
    )
    return df


def extract_and_export_dataset(
    output_path: Path | None = None,
    n_samples: int = 50_000,
) -> Path:
    """Executes dataset generation and exports to CSV in workspace."""
    df = synthesize_atm_dataset(n_samples=n_samples)
    out_file = output_path or OUTPUT_CSV_LOCAL
    df.to_csv(out_file, index=False)
    logger.info("Saved synthesized dataset to: %s", out_file)
    return out_file


if __name__ == "__main__":
    extract_and_export_dataset()
