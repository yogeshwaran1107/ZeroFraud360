"""Data Loader & Schema Validation Module for ATM & Cash Withdrawal Fraud Detection.

This module handles:
1. Ingestion and schema validation of historical ATM and cash withdrawal telemetry.
2. High-fidelity synthetic transaction generation when no external data source is provided.
3. Seamless integration with docx_extractor for automated training data extraction.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("atm_data_loader")

# Canonical Schema Definitions
REQUIRED_COLUMNS: list[str] = [
    "withdrawal_amount",
    "channel_deviation_score",
    "velocity_10m",
    "velocity_24h",
    "distance_from_last_terminal_km",
    "is_off_hours",
    "failed_auth_attempts",
    "amount_to_avg_ratio",
    "is_fraud",
]

FEATURE_COLUMNS: list[str] = [
    "withdrawal_amount",
    "channel_deviation_score",
    "velocity_10m",
    "velocity_24h",
    "distance_from_last_terminal_km",
    "is_off_hours",
    "failed_auth_attempts",
    "amount_to_avg_ratio",
]

TARGET_COLUMN: str = "is_fraud"


def generate_synthetic_data(
    n_samples: int = 25_000,
    fraud_ratio: float = 0.015,
    random_state: int = 42,
) -> pd.DataFrame:
    """Generates synthetic ATM/cash withdrawal data with realistic fraud patterns.

    Args:
        n_samples: Total number of records to generate.
        fraud_ratio: Target fraud prevalence rate (default: ~1.5%).
        random_state: Seed for reproducibility.

    Returns:
        pd.DataFrame containing generated records strictly matching REQUIRED_COLUMNS.
    """
    logger.info(
        "Synthesizing %d ATM/cash transactions with %.2f%% fraud incidence (seed=%d)...",
        n_samples,
        fraud_ratio * 100,
        random_state,
    )
    rng = np.random.default_rng(random_state)

    n_fraud = int(round(n_samples * fraud_ratio))
    n_legit = n_samples - n_fraud

    # --- 1. Legitimate Transactions (~98.5%) ---
    # Log-normal amounts with multiples of 100/500 (median ~₹2,500)
    legit_amount = rng.lognormal(mean=7.7, sigma=0.65, size=n_legit)
    legit_amount = np.clip(legit_amount, a_min=100.0, a_max=20000.0)
    legit_amount = np.round(legit_amount / 100.0) * 100.0

    # Channel deviation: Customer is using preferred channels (0.0 to 0.08)
    legit_dev = rng.uniform(0.0, 0.08, size=n_legit)

    # Velocity: typical everyday withdrawal (0 in 10m, 0-1 in 24h)
    legit_vel_10m = rng.poisson(lam=0.03, size=n_legit)
    legit_vel_24h = rng.poisson(lam=0.8, size=n_legit) + legit_vel_10m

    # Distance: neighborhood ATM/branch (median ~2.5km)
    legit_dist = rng.exponential(scale=3.2, size=n_legit)
    legit_dist = np.clip(legit_dist, a_min=0.1, a_max=35.0)

    # Off-hours (23:00 - 05:00): very infrequent (~3%)
    legit_off_hours = rng.binomial(n=1, p=0.03, size=n_legit)

    # Prior failed authentication attempts: rare (~2%)
    legit_failed_auth = rng.binomial(n=1, p=0.02, size=n_legit)

    # Amount to historical average ratio: centered near 1.0 (0.4 to 1.8)
    legit_ratio = np.clip(rng.normal(loc=1.0, scale=0.3, size=n_legit), a_min=0.2, a_max=2.5)

    df_legit = pd.DataFrame(
        {
            "withdrawal_amount": np.round(legit_amount, 2),
            "channel_deviation_score": np.round(legit_dev, 4),
            "velocity_10m": legit_vel_10m.astype(np.int32),
            "velocity_24h": legit_vel_24h.astype(np.int32),
            "distance_from_last_terminal_km": np.round(legit_dist, 2),
            "is_off_hours": legit_off_hours.astype(np.int32),
            "failed_auth_attempts": legit_failed_auth.astype(np.int32),
            "amount_to_avg_ratio": np.round(legit_ratio, 2),
            "is_fraud": np.zeros(n_legit, dtype=np.int32),
        }
    )

    # --- 2. Fraudulent Transactions (~1.5%) ---
    # Elevated cash-out amounts, severe channel deviations, rapid velocity bursts
    fraud_amount = rng.lognormal(mean=9.8, sigma=0.5, size=n_fraud)
    fraud_amount = np.clip(fraud_amount, a_min=10000.0, a_max=80000.0)
    fraud_amount = np.round(fraud_amount / 500.0) * 500.0

    # Severe deviation from customer's known channel
    fraud_dev = rng.uniform(0.65, 1.0, size=n_fraud)

    # Velocity spikes: 2-6 rapid withdrawals in 10m
    fraud_vel_10m = rng.poisson(lam=2.8, size=n_fraud) + 1
    fraud_vel_24h = rng.poisson(lam=7.5, size=n_fraud) + fraud_vel_10m

    # Distant terminal: impossible travel or rogue CSP terminal
    fraud_dist = rng.lognormal(mean=5.2, sigma=1.3, size=n_fraud)
    fraud_dist = np.clip(fraud_dist, a_min=15.0, a_max=2500.0)

    # Off-hours exploitation: high rate (55%)
    fraud_off_hours = rng.binomial(n=1, p=0.55, size=n_fraud)

    # Failed authentication attempts: frequent guessing/biometric retry
    fraud_failed_auth = rng.choice([0, 1, 2, 3, 4], p=[0.20, 0.25, 0.25, 0.20, 0.10], size=n_fraud)

    # Massive surge relative to historical average
    fraud_ratio_arr = rng.uniform(3.5, 14.0, size=n_fraud)

    df_fraud = pd.DataFrame(
        {
            "withdrawal_amount": np.round(fraud_amount, 2),
            "channel_deviation_score": np.round(fraud_dev, 4),
            "velocity_10m": fraud_vel_10m.astype(np.int32),
            "velocity_24h": fraud_vel_24h.astype(np.int32),
            "distance_from_last_terminal_km": np.round(fraud_dist, 2),
            "is_off_hours": fraud_off_hours.astype(np.int32),
            "failed_auth_attempts": fraud_failed_auth.astype(np.int32),
            "amount_to_avg_ratio": np.round(fraud_ratio_arr, 2),
            "is_fraud": np.ones(n_fraud, dtype=np.int32),
        }
    )

    df = pd.concat([df_legit, df_fraud], ignore_index=True)
    df = df.sample(frac=1.0, random_state=random_state).reset_index(drop=True)

    logger.info(
        "Generated %d rows. Actual fraud rate: %.2f%% (%d fraud cases).",
        len(df),
        df["is_fraud"].mean() * 100,
        df["is_fraud"].sum(),
    )
    return df


def validate_schema(df: pd.DataFrame) -> pd.DataFrame:
    """Validates that a DataFrame conforms to the expected ATM fraud schema.

    Args:
        df: Input DataFrame.

    Returns:
        Validated and sanitised DataFrame.
    """
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(
            f"Schema validation failed! Missing required columns: {missing_cols}. "
            f"Expected schema: {REQUIRED_COLUMNS}"
        )

    # Handle missing values defensively
    null_counts = df[REQUIRED_COLUMNS].isnull().sum()
    if null_counts.any():
        logger.warning("Detected missing values in dataset:\n%s", null_counts[null_counts > 0])
        df = df.dropna(subset=[TARGET_COLUMN]).copy()
        df = df.fillna(
            {
                "withdrawal_amount": df["withdrawal_amount"].median(),
                "channel_deviation_score": 0.0,
                "velocity_10m": 0,
                "velocity_24h": 0,
                "distance_from_last_terminal_km": 0.0,
                "is_off_hours": 0,
                "failed_auth_attempts": 0,
                "amount_to_avg_ratio": 1.0,
            }
        )

    # Cast types strictly
    df["withdrawal_amount"] = pd.to_numeric(df["withdrawal_amount"], errors="coerce").astype(np.float64)
    df["channel_deviation_score"] = pd.to_numeric(df["channel_deviation_score"], errors="coerce").fillna(0.0).astype(np.float64)
    df["velocity_10m"] = pd.to_numeric(df["velocity_10m"], errors="coerce").fillna(0).astype(np.int32)
    df["velocity_24h"] = pd.to_numeric(df["velocity_24h"], errors="coerce").fillna(0).astype(np.int32)
    df["distance_from_last_terminal_km"] = pd.to_numeric(df["distance_from_last_terminal_km"], errors="coerce").fillna(0.0).astype(np.float64)
    df["is_off_hours"] = pd.to_numeric(df["is_off_hours"], errors="coerce").fillna(0).astype(np.int32)
    df["failed_auth_attempts"] = pd.to_numeric(df["failed_auth_attempts"], errors="coerce").fillna(0).astype(np.int32)
    df["amount_to_avg_ratio"] = pd.to_numeric(df["amount_to_avg_ratio"], errors="coerce").fillna(1.0).astype(np.float64)
    df["is_fraud"] = pd.to_numeric(df["is_fraud"], errors="coerce").astype(np.int32)

    unique_targets = set(df[TARGET_COLUMN].unique())
    if not unique_targets.issubset({0, 1}):
        raise ValueError(f"Target column '{TARGET_COLUMN}' contains non-binary values: {unique_targets}")

    return df


def load_or_generate_data(csv_path: Optional[str | Path] = None) -> pd.DataFrame:
    """Loads ATM transaction data from CSV, extracts via docx_extractor, or falls back to synthetic data."""
    resolved_path: Path | None = None

    if csv_path is not None:
        p = Path(csv_path)
        if p.is_file():
            resolved_path = p
        elif p.is_dir():
            candidate = p / "atm_withdrawal_dataset.csv"
            if candidate.is_file():
                resolved_path = candidate

    # Standard candidate paths in local workspace
    if resolved_path is None:
        local_candidate = Path(__file__).resolve().parent / "atm_withdrawal_dataset.csv"
        if local_candidate.is_file():
            resolved_path = local_candidate

    if resolved_path is not None:
        logger.info("Loading ATM dataset from: %s", resolved_path)
        df = pd.read_csv(resolved_path)
        return validate_schema(df)

    # Attempt extraction via docx_extractor
    try:
        from docx_extractor import extract_and_export_dataset
        generated_csv = extract_and_export_dataset()
        if generated_csv.is_file():
            logger.info("Successfully generated dataset via docx_extractor: %s", generated_csv)
            df = pd.read_csv(generated_csv)
            return validate_schema(df)
    except Exception as exc:
        logger.warning("docx_extractor could not generate dataset: %s", exc)

    logger.warning("No pre-existing dataset found. Falling back to synthetic generation.")
    df = generate_synthetic_data()
    return validate_schema(df)


if __name__ == "__main__":
    df = load_or_generate_data()
    print("Loaded ATM Dataset Summary:")
    print("Shape:", df.shape)
    print("Fraud count:", df["is_fraud"].sum(), f"({df['is_fraud'].mean() * 100:.2f}%)")
    print(df.head(5))
