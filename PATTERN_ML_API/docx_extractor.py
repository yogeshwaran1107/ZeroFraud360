"""Extractor and Dataset Synthesizer for Banking Fraud Detection (v1.0 Updated).

Extracts all 170 suspicious transaction patterns from 'updated dataset-1.0.docx'
(including Table 0 patterns 1-110 and Table 2 patterns 101-160) in the user's
training data directory and synthesizes an authentic, high-volume training dataset.
"""

from __future__ import annotations

import json
import logging
import os
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
logger = logging.getLogger("docx_extractor")

LOCAL_DIR = Path(__file__).resolve().parent
UPDATED_DOCX_PATH = LOCAL_DIR / "updated dataset-1.0.docx"
LEGACY_DOCX_PATH = LOCAL_DIR / "dataset-1.docx"
LOCAL_OUTPUT_CSV = LOCAL_DIR / "financial_fraud_dataset.csv"
DEFAULT_OUTPUT_CSV = LOCAL_OUTPUT_CSV


def resolve_docx_path(preferred_path: Path | None = None) -> Path:
    """Finds the most up-to-date docx file available in the local directory."""
    if preferred_path and preferred_path.is_file():
        return preferred_path
    if UPDATED_DOCX_PATH.is_file():
        return UPDATED_DOCX_PATH
    if LEGACY_DOCX_PATH.is_file():
        return LEGACY_DOCX_PATH
    raise FileNotFoundError(
        f"Neither '{UPDATED_DOCX_PATH.name}' nor '{LEGACY_DOCX_PATH.name}' was found in {LOCAL_DIR}."
    )


def extract_patterns_from_docx(docx_path: Path | None = None) -> list[dict[str, str]]:
    """Extracts all patterns across tables from the docx file without third-party dependencies.

    Args:
        docx_path: Optional path to the .docx document.

    Returns:
        List of pattern dicts with {'id', 'name', 'example', 'table_source'}.
    """
    path = resolve_docx_path(docx_path)
    logger.info("Extracting pattern specifications from '%s'...", path)

    with zipfile.ZipFile(path) as z:
        xml_content = z.read("word/document.xml")

    root = ET.fromstring(xml_content)
    namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    tables = root.findall(".//w:tbl", namespaces)

    all_patterns: list[dict[str, str]] = []

    # Process Table 0: Patterns 1-110 (No., Pattern, Example Data)
    if len(tables) > 0:
        rows = tables[0].findall(".//w:tr", namespaces)
        for r_idx in range(1, len(rows)):
            cells = rows[r_idx].findall(".//w:tc", namespaces)
            texts = ["".join([t.text or "" for t in c.findall(".//w:t", namespaces)]).strip() for c in cells]
            if len(texts) >= 3 and texts[1]:
                all_patterns.append({
                    "id": f"T0_{texts[0]}",
                    "name": texts[1],
                    "example": texts[2],
                    "table_source": "Table_0_Base",
                })

    # Process Table 2 (if present): Patterns 101-160 (#, Pattern, Proper Example)
    if len(tables) > 2:
        rows = tables[2].findall(".//w:tr", namespaces)
        for r_idx in range(1, len(rows)):
            cells = rows[r_idx].findall(".//w:tc", namespaces)
            texts = ["".join([t.text or "" for t in c.findall(".//w:t", namespaces)]).strip() for c in cells]
            if len(texts) >= 3 and texts[1]:
                all_patterns.append({
                    "id": f"T2_{texts[0]}",
                    "name": texts[1],
                    "example": texts[2],
                    "table_source": "Table_2_Updated",
                })

    logger.info("Extracted %d total pattern definitions across tables.", len(all_patterns))
    return all_patterns


def parse_numeric_amount(amount_str: str) -> float | None:
    """Parses Indian currency notation (₹, K, L, Lakh, Crore) to float."""
    clean = amount_str.replace("₹", "").replace(",", "").strip()
    match = re.search(r"(\d+(?:\.\d+)?)\s*(K|L|Lakh|Cr)?", clean, re.IGNORECASE)
    if not match:
        return None
    val = float(match.group(1))
    unit = (match.group(2) or "").upper()
    if unit == "K":
        val *= 1_000
    elif unit in ("L", "LAKH"):
        val *= 100_000
    elif unit == "CR":
        val *= 10_000_000
    return val


def generate_pattern_grounded_dataset(
    docx_path: Path | None = None,
    n_samples: int = 50_000,
    fraud_ratio: float = 0.035,
    random_state: int = 42,
) -> pd.DataFrame:
    """Generates an authentic training dataset embodying all 170 patterns from updated docx.

    Args:
        docx_path: Path to updated dataset-1.0.docx.
        n_samples: Total number of rows to generate (default: 50,000).
        fraud_ratio: Prevalence of fraud transactions (~3.5%).
        random_state: Seed for reproducibility.

    Returns:
        DataFrame containing generated transactions.
    """
    patterns = extract_patterns_from_docx(docx_path)
    n_patterns = len(patterns)
    logger.info("Loaded %d distinct patterns from document.", n_patterns)

    rng = np.random.default_rng(random_state)
    n_fraud_total = int(round(n_samples * fraud_ratio))
    n_legit_total = n_samples - n_fraud_total

    # =========================================================================
    # 1. LEGITIMATE TRANSACTIONS (Baseline Everyday Banking)
    # Reflects normal banking patterns documented in docx:
    # "Normal ₹1K–₹5K", "2/day", "daytime", "normal location", "registered device"
    # =========================================================================
    logger.info("Generating %d baseline legitimate banking transactions...", n_legit_total)

    # Everyday spending: mostly ₹150 to ₹4,500, occasional bill payment up to ₹30,000
    legit_amount = rng.lognormal(mean=7.1, sigma=0.9, size=n_legit_total)
    legit_amount = np.clip(legit_amount, a_min=10.0, a_max=35_000.0)

    # Velocity: typical frequency 0-1 within 10m, 1-4 per day
    legit_vel_10m = rng.poisson(lam=0.08, size=n_legit_total)
    legit_vel_24h = rng.poisson(lam=1.9, size=n_legit_total) + legit_vel_10m

    # Distance: mostly local swipe/UPI within home/city radius (< 15 km)
    legit_distance = rng.exponential(scale=5.5, size=n_legit_total)
    legit_distance = np.clip(legit_distance, a_min=0.0, a_max=100.0)

    # Device: familiar registered device (~97.5% known device)
    legit_new_device = rng.binomial(n=1, p=0.025, size=n_legit_total)

    df_legit = pd.DataFrame(
        {
            "amount": np.round(legit_amount, 2),
            "velocity_10m": legit_vel_10m.astype(np.int32),
            "velocity_24h": legit_vel_24h.astype(np.int32),
            "distance_from_last_km": np.round(legit_distance, 2),
            "is_new_device": legit_new_device.astype(np.int32),
            "pattern_name": "Normal Legitimate Activity",
            "is_fraud": np.zeros(n_legit_total, dtype=np.int32),
        }
    )

    # =========================================================================
    # 2. FRAUD TRANSACTIONS DERIVED FROM ALL 170 PATTERNS
    # =========================================================================
    logger.info("Generating %d fraud transactions across all %d patterns...", n_fraud_total, n_patterns)

    fraud_records = []
    samples_per_pattern = max(1, n_fraud_total // n_patterns)

    for p in patterns:
        p_id = p["id"]
        p_name = p["name"]
        p_example = p["example"]

        # Parse any currency amounts in the example
        amounts_found = [
            parse_numeric_amount(m)
            for m in re.findall(r"₹\s*[\d,]+(?:\.\d+)?\s*(?:K|L|Lakh|Cr)?", p_example, re.I)
        ]
        valid_amounts = [a for a in amounts_found if a is not None and a > 0]
        base_anchor = valid_amounts[0] if valid_amounts else None

        p_name_lower = p_name.lower()

        for _ in range(samples_per_pattern):
            # 1. Micro-Transaction Burst / Card Testing (Pattern 102, Micro-transactions)
            if "micro" in p_name_lower:
                amt = float(rng.uniform(20.0, 99.0)) if not base_anchor else base_anchor * rng.uniform(0.9, 1.1)
                vel_10m = int(rng.integers(5, 15))  # High burst in 10 minutes
                vel_24h = vel_10m + int(rng.integers(10, 30))
                dist = float(rng.exponential(30.0))
                new_dev = int(rng.binomial(1, 0.70))

            # 2. Round Amount Repetition (Pattern 101: ₹10,000 repeated in 25m)
            elif "round amount" in p_name_lower:
                amt = base_anchor if base_anchor else float(rng.choice([5_000.0, 10_000.0, 20_000.0, 50_000.0]))
                vel_10m = int(rng.integers(3, 8))
                vel_24h = vel_10m + int(rng.integers(8, 25))
                dist = float(rng.exponential(20.0))
                new_dev = int(rng.binomial(1, 0.40))

            # 3. High Velocity / Storm / Burst / Rapid Relay / Switching
            elif any(k in p_name_lower for k in ["velocity", "storm", "burst", "rapid", "relay", "switching", "window concentration"]):
                vel_10m = int(rng.integers(6, 25))
                vel_24h = vel_10m + int(rng.integers(15, 60))
                amt = base_anchor * rng.uniform(0.85, 1.15) if base_anchor else float(rng.lognormal(10.2, 1.0))
                dist = float(rng.exponential(45.0))
                new_dev = int(rng.binomial(1, 0.50))

            # 4. Large Amount Anomaly / High-Value / Escalation / Drain / Pass-Through
            elif any(k in p_name_lower for k in ["amount", "large", "escalation", "reduction", "high-value", "drain", "mismatch", "pass-through", "expansion after large"]):
                amt = base_anchor * rng.uniform(0.9, 1.25) if base_anchor else float(rng.uniform(100_000, 1_000_000))
                vel_10m = int(rng.integers(2, 8))
                vel_24h = vel_10m + int(rng.integers(6, 25))
                dist = float(rng.lognormal(4.2, 1.2))
                new_dev = int(rng.binomial(1, 0.65))

            # 5. Geographic / Location Anomaly
            elif any(k in p_name_lower for k in ["geographic", "location"]):
                amt = base_anchor * rng.uniform(0.85, 1.15) if base_anchor else float(rng.lognormal(9.0, 1.0))
                vel_10m = int(rng.integers(1, 5))
                vel_24h = vel_10m + int(rng.integers(2, 12))
                dist = float(rng.uniform(350.0, 5000.0))
                new_dev = int(rng.binomial(1, 0.85))

            # 6. Device Switching / Association
            elif any(k in p_name_lower for k in ["device", "network", "association"]):
                amt = base_anchor * rng.uniform(0.85, 1.15) if base_anchor else float(rng.lognormal(8.6, 1.0))
                vel_10m = int(rng.integers(3, 8))
                vel_24h = vel_10m + int(rng.integers(6, 22))
                dist = float(rng.exponential(35.0))
                new_dev = 1  # Definite new device

            # 7. Dormant Account Burst / Inactive Reactivation / Timing Break
            elif any(k in p_name_lower for k in ["dormant", "gap", "inactive", "timing break"]):
                amt = base_anchor * rng.uniform(0.85, 1.2) if base_anchor else float(rng.uniform(50_000, 500_000))
                vel_10m = int(rng.integers(3, 12))
                vel_24h = vel_10m + int(rng.integers(8, 35))
                dist = float(rng.exponential(30.0))
                new_dev = int(rng.binomial(1, 0.60))

            # 8. Threshold-Adjacent / Repeated Amounts
            elif any(k in p_name_lower for k in ["threshold", "repeated", "round", "split", "merge", "alternating"]):
                if base_anchor:
                    amt = base_anchor + float(rng.choice([-500, 0, 500, -100]))
                else:
                    amt = float(rng.choice([49_500.0, 49_900.0, 50_000.0, 99_000.0, 100_000.0]))
                vel_10m = int(rng.integers(2, 9))
                vel_24h = vel_10m + int(rng.integers(6, 25))
                dist = float(rng.exponential(20.0))
                new_dev = int(rng.binomial(1, 0.40))

            # 9. General Relational / Graph / Fan-In / Fan-Out
            else:
                amt = base_anchor * rng.uniform(0.85, 1.15) if base_anchor else float(rng.lognormal(8.8, 1.1))
                vel_10m = int(rng.integers(2, 8))
                vel_24h = vel_10m + int(rng.integers(5, 22))
                dist = float(rng.exponential(30.0))
                new_dev = int(rng.binomial(1, 0.50))

            fraud_records.append(
                {
                    "amount": round(float(np.clip(amt, 10.0, 2_500_000.0)), 2),
                    "velocity_10m": vel_10m,
                    "velocity_24h": vel_24h,
                    "distance_from_last_km": round(float(np.clip(dist, 0.0, 10_000.0)), 2),
                    "is_new_device": int(new_dev),
                    "pattern_name": f"{p_id}: {p_name}",
                    "is_fraud": 1,
                }
            )

    df_fraud = pd.DataFrame(fraud_records)

    # Combine and shuffle
    df_combined = pd.concat([df_legit, df_fraud], ignore_index=True)
    df_combined = df_combined.sample(frac=1.0, random_state=random_state).reset_index(drop=True)

    fraud_pct = (df_combined["is_fraud"].sum() / len(df_combined)) * 100
    logger.info(
        "Successfully synthesized %d records (Legitimate: %d, Fraud: %d, Fraud Rate: %.2f%%).",
        len(df_combined),
        len(df_legit),
        len(df_fraud),
        fraud_pct,
    )
    return df_combined


def extract_and_export_dataset(
    docx_path: Path | None = None,
    output_path: Path = LOCAL_OUTPUT_CSV,
    n_samples: int = 50_000,
) -> Path:
    """Executes full extraction from docx and saves updated dataset as CSV in workspace."""
    resolved_docx = resolve_docx_path(docx_path)
    logger.info("Using document source: %s", resolved_docx)

    df = generate_pattern_grounded_dataset(docx_path=resolved_docx, n_samples=n_samples)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    logger.info("Saved dataset to workspace: %s", output_path)

    return output_path


if __name__ == "__main__":
    out_file = extract_and_export_dataset()
    print(f"\nExtraction complete! Updated dataset exported to: {out_file}")
