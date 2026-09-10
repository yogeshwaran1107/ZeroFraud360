"""Data Loader & Schema Validation Module for Real-Time Banking Fraud Detection.

This module handles:
1. Ingestion and strict schema validation of historical banking transaction data.
2. High-fidelity synthetic transaction generation (~1% fraud incidence) when
   no external data source is provided or when the given path does not exist.
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
logger = logging.getLogger("data_loader")

# Canonical Schema Definitions
REQUIRED_COLUMNS: list[str] = [
    "amount",
    "velocity_10m",
    "velocity_24h",
    "distance_from_last_km",
    "is_new_device",
    "is_fraud",
]

FEATURE_COLUMNS: list[str] = [
    "amount",
    "velocity_10m",
    "velocity_24h",
    "distance_from_last_km",
    "is_new_device",
]

TARGET_COLUMN: str = "is_fraud"


def generate_synthetic_data(
    n_samples: int = 20_000,
    fraud_ratio: float = 0.01,
    random_state: int = 42,
) -> pd.DataFrame:
    """Generates synthetic banking transaction data with realistic fraud patterns.

    Args:
        n_samples: Total number of transactions to generate (default: 20,000).
        fraud_ratio: Target fraud prevalence rate (default: 0.01 -> ~1%).
        random_state: Seed for deterministic, reproducible generation.

    Returns:
        pd.DataFrame containing the generated transactions compliant with REQUIRED_COLUMNS.
    """
    logger.info(
        "Synthesizing %d banking transactions with %.2f%% target fraud rate (seed=%d)...",
        n_samples,
        fraud_ratio * 100,
        random_state,
    )
    rng = np.random.default_rng(random_state)

    n_fraud = int(round(n_samples * fraud_ratio))
    n_legit = n_samples - n_fraud

    # --- 1. Legitimate Transactions (~99%) ---
    # Typical everyday spending: log-normal amounts (median ~$35, 95th percentile ~$150)
    legit_amount = rng.lognormal(mean=3.5, sigma=0.8, size=n_legit)
    legit_amount = np.clip(legit_amount, a_min=1.0, a_max=2500.0)

    # Velocity: low frequency, few transactions in 10m or 24h
    legit_vel_10m = rng.poisson(lam=0.15, size=n_legit)
    legit_vel_24h = rng.poisson(lam=2.5, size=n_legit) + legit_vel_10m

    # Distance from last card swipe: mostly local travel (median ~5km, exp distribution)
    legit_distance = rng.exponential(scale=8.0, size=n_legit)
    legit_distance = np.clip(legit_distance, a_min=0.0, a_max=350.0)

    # Device: familiar/registered device used ~96% of the time
    legit_new_device = rng.binomial(n=1, p=0.04, size=n_legit)
    legit_is_fraud = np.zeros(n_legit, dtype=np.int32)

    # --- 2. Fraudulent Transactions (~1%) ---
    # Compromised cards / account takeover: skewed toward larger values or rapid drain
    fraud_amount = rng.lognormal(mean=6.2, sigma=1.1, size=n_fraud)
    fraud_amount = np.clip(fraud_amount, a_min=25.0, a_max=10000.0)

    # High velocity bursts (card testing or fast cash out)
    fraud_vel_10m = rng.poisson(lam=3.8, size=n_fraud) + 1
    fraud_vel_24h = rng.poisson(lam=12.5, size=n_fraud) + fraud_vel_10m

    # Distant transactions (cross-border, botnets, card-not-present fraud)
    fraud_distance = rng.lognormal(mean=5.5, sigma=1.4, size=n_fraud)
    fraud_distance = np.clip(fraud_distance, a_min=10.0, a_max=12000.0)

    # Device: attackers frequently operate from fresh emulators, new devices, or proxies
    fraud_new_device = rng.binomial(n=1, p=0.72, size=n_fraud)
    fraud_is_fraud = np.ones(n_fraud, dtype=np.int32)

    # --- Assemble and Shuffle ---
    df_legit = pd.DataFrame(
        {
            "amount": np.round(legit_amount, 2),
            "velocity_10m": legit_vel_10m.astype(np.int32),
            "velocity_24h": legit_vel_24h.astype(np.int32),
            "distance_from_last_km": np.round(legit_distance, 2),
            "is_new_device": legit_new_device.astype(np.int32),
            "is_fraud": legit_is_fraud,
        }
    )

    df_fraud = pd.DataFrame(
        {
            "amount": np.round(fraud_amount, 2),
            "velocity_10m": fraud_vel_10m.astype(np.int32),
            "velocity_24h": fraud_vel_24h.astype(np.int32),
            "distance_from_last_km": np.round(fraud_distance, 2),
            "is_new_device": fraud_new_device.astype(np.int32),
            "is_fraud": fraud_is_fraud,
        }
    )

    df = pd.concat([df_legit, df_fraud], ignore_index=True)
    df = df.sample(frac=1.0, random_state=random_state).reset_index(drop=True)

    actual_fraud_rate = df["is_fraud"].mean() * 100
    logger.info(
        "Successfully generated %d rows. Actual fraud rate: %.2f%% (%d fraud cases).",
        len(df),
        actual_fraud_rate,
        df["is_fraud"].sum(),
    )
    return df


def validate_schema(df: pd.DataFrame) -> pd.DataFrame:
    """Validates that a DataFrame conforms to the expected banking fraud schema.

    Args:
        df: Input DataFrame to check.

    Returns:
        The validated and sanitised DataFrame.

    Raises:
        ValueError: If required columns are missing, or invalid values/types exist.
    """
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(
            f"Schema validation failed! Missing required columns: {missing_cols}. "
            f"Expected schema: {REQUIRED_COLUMNS}"
        )

    # Verify absence of completely null rows or critical null features
    null_counts = df[REQUIRED_COLUMNS].isnull().sum()
    if null_counts.any():
        logger.warning("Detected missing values in dataset:\n%s", null_counts[null_counts > 0])
        # Drop rows with null target or fill feature missing values defensively
        df = df.dropna(subset=[TARGET_COLUMN]).copy()
        df = df.fillna(
            {
                "amount": df["amount"].median(),
                "velocity_10m": 0,
                "velocity_24h": 0,
                "distance_from_last_km": 0.0,
                "is_new_device": 0,
            }
        )

    # Cast types consistently
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").astype(np.float64)
    df["velocity_10m"] = pd.to_numeric(df["velocity_10m"], errors="coerce").fillna(0).astype(np.int32)
    df["velocity_24h"] = pd.to_numeric(df["velocity_24h"], errors="coerce").fillna(0).astype(np.int32)
    df["distance_from_last_km"] = pd.to_numeric(df["distance_from_last_km"], errors="coerce").fillna(0.0).astype(np.float64)
    df["is_new_device"] = pd.to_numeric(df["is_new_device"], errors="coerce").fillna(0).astype(np.int32)
    df["is_fraud"] = pd.to_numeric(df["is_fraud"], errors="coerce").astype(np.int32)

    # Validate target values are strictly binary
    unique_targets = set(df[TARGET_COLUMN].unique())
    if not unique_targets.issubset({0, 1}):
        raise ValueError(
            f"Target column '{TARGET_COLUMN}' contains non-binary values: {unique_targets}"
        )

    return df


def load_or_generate_data(csv_path: Optional[str | Path] = None) -> pd.DataFrame:
    """Loads transaction data from a CSV/docx file, directory, or falls back to synthetic data.

    Resolution order:
    1. If `csv_path` is a CSV file, reads and validates directly.
    2. If `csv_path` is a directory, searches for 'financial_fraud_dataset.csv' or 'dataset-1.docx'.
    3. If `csv_path` is a docx file, triggers extraction via docx_extractor.
    4. If `csv_path` is None, checks known locations (user folder, workspace) before synthetic fallback.

    Args:
        csv_path: Optional path to a CSV file, docx file, or folder.

    Returns:
        Validated pandas DataFrame with standard feature and target columns.
    """
    resolved_path: Path | None = None

    if csv_path is not None:
        p = Path(csv_path)
        if p.is_dir():
            # Check for existing CSV in directory
            candidate_csv = p / "financial_fraud_dataset.csv"
            candidate_docx_updated = p / "updated dataset-1.0.docx"
            candidate_docx_legacy = p / "dataset-1.docx"
            candidate_docx = candidate_docx_updated if candidate_docx_updated.is_file() else candidate_docx_legacy
            if candidate_csv.is_file():
                resolved_path = candidate_csv
            elif candidate_docx.is_file():
                try:
                    from docx_extractor import extract_and_export_dataset
                    resolved_path = extract_and_export_dataset(docx_path=candidate_docx)
                except Exception as exc:
                    logger.warning("Failed to extract data from docx: %s", exc)
        elif p.is_file():
            if p.suffix.lower() == ".docx":
                try:
                    from docx_extractor import extract_and_export_dataset
                    resolved_path = extract_and_export_dataset(docx_path=p)
                except Exception as exc:
                    logger.warning("Failed to extract data from docx: %s", exc)
            else:
                resolved_path = p
        else:
            logger.warning("Specified path '%s' does not exist.", csv_path)

    # If still not resolved, check standard local workspace locations
    if resolved_path is None:
        local_dir = Path(__file__).resolve().parent
        local_csv = local_dir / "financial_fraud_dataset.csv"
        local_docx_updated = local_dir / "updated dataset-1.0.docx"
        local_docx_legacy = local_dir / "dataset-1.docx"
        local_docx = local_docx_updated if local_docx_updated.is_file() else local_docx_legacy

        if local_csv.is_file():
            resolved_path = local_csv
        elif local_docx.is_file():
            try:
                from docx_extractor import extract_and_export_dataset
                resolved_path = extract_and_export_dataset(docx_path=local_docx)
            except Exception as exc:
                logger.warning("Failed to extract data from local docx: %s", exc)

    if resolved_path and resolved_path.is_file():
        logger.info("Loading transaction dataset from '%s'...", resolved_path.resolve())
        df = pd.read_csv(resolved_path)
        validated_df = validate_schema(df)
        logger.info("Dataset loaded successfully: %d rows, %d columns.", *validated_df.shape)
        return validated_df

    logger.info("No valid CSV or docx source found. Initiating synthetic banking data generation...")
    df = generate_synthetic_data(n_samples=20_000, fraud_ratio=0.01, random_state=42)
    return validate_schema(df)


if __name__ == "__main__":
    # Self-test when executed directly
    data = load_or_generate_data()
    print("\n--- Dataset Preview ---")
    print(data.head())
    print("\n--- Class Balance ---")
    print(data["is_fraud"].value_counts(normalize=True).rename("proportion"))
    print("\n--- Descriptive Statistics by Fraud Class ---")
    numeric_cols = [c for c in data.columns if c in REQUIRED_COLUMNS]
    print(data[numeric_cols].groupby("is_fraud").mean())

