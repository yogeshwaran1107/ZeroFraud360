"""Training Pipeline for Real-Time ATM & Cash Withdrawal Fraud Detection using LightGBM.

Features:
1. Ingests raw data from 'atm_withdrawal_dataset.csv' or falls back to synthetic generation.
2. Stratified 80/20 train/validation split preserving minority fraud incidence.
3. Class imbalance mitigation using scale_pos_weight calculation.
4. Early stopping on the validation set using binary logloss / PR-AUC.
5. Comprehensive evaluation (PR-AUC, ROC-AUC, Precision, Recall, Decision Thresholds).
6. Persists the production booster (`atm_fraud_model.txt`) and feature metadata (`features.json`).
"""

from __future__ import annotations

import argparse
import inspect
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import lightgbm as lgb
import numpy as np
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

from data_loader import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    load_or_generate_data,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("atm_train_pipeline")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train LightGBM ATM & Cash Withdrawal Fraud Detection Model."
    )
    parser.add_argument(
        "--data-path",
        type=str,
        default=None,
        help="Path to CSV dataset. If omitted, searches default locations or generates data.",
    )
    parser.add_argument(
        "--artifacts-dir",
        type=str,
        default=None,
        help="Directory to save model artifacts. Defaults to ./artifacts relative to script.",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Seed for random number generators ensuring reproducibility.",
    )
    return parser.parse_args()


def run_training(
    data_path: str | None = None,
    artifacts_dir: Path | None = None,
    random_state: int = 42,
) -> dict:
    """Executes model training, validation evaluation, and artifact persistence.

    Args:
        data_path: Optional path to external CSV dataset.
        artifacts_dir: Directory where model outputs will be written.
        random_state: Random seed for reproducibility.

    Returns:
        Dictionary summarizing evaluation metrics and saved artifact paths.
    """
    if artifacts_dir is None:
        artifacts_dir = Path(__file__).resolve().parent / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    # 1. Ingest Data
    logger.info("=== STEP 1: Ingesting ATM & Cash Withdrawal Data ===")
    df = load_or_generate_data(csv_path=data_path)

    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]

    total_samples = len(df)
    total_fraud = int(y.sum())
    fraud_rate = (total_fraud / total_samples) * 100
    logger.info(
        "Ingested %d total records. Fraud count: %d (%.2f%%).",
        total_samples,
        total_fraud,
        fraud_rate,
    )

    # 2. Stratified Train/Validation Split (80% Train, 20% Validation)
    logger.info("=== STEP 2: Splitting Dataset (80/20 Stratified) ===")
    X_train, X_val, y_train, y_val = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=random_state,
        stratify=y,
    )

    n_train_pos = int(y_train.sum())
    n_train_neg = len(y_train) - n_train_pos
    scale_pos_weight = n_train_neg / max(n_train_pos, 1)

    logger.info(
        "Train set: %d rows (Fraud: %d, Legit: %d)",
        len(X_train),
        n_train_pos,
        n_train_neg,
    )
    logger.info(
        "Val set:   %d rows (Fraud: %d, Legit: %d)",
        len(X_val),
        int(y_val.sum()),
        len(y_val) - int(y_val.sum()),
    )
    logger.info(
        "Calculated scale_pos_weight = %.2f to counterbalance fraud rarity.",
        scale_pos_weight,
    )

    # 3. Model Configuration & Training
    logger.info("=== STEP 3: Initializing & Training LightGBM Booster ===")
    model = lgb.LGBMClassifier(
        objective="binary",
        n_estimators=1000,
        learning_rate=0.05,
        num_leaves=31,
        max_depth=6,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos_weight,
        random_state=random_state,
        importance_type="gain",
        verbosity=-1,
        n_jobs=-1,
    )

    callbacks = [
        lgb.early_stopping(stopping_rounds=30, verbose=True),
        lgb.log_evaluation(period=50),
    ]

    sig = inspect.signature(model.fit)
    fit_kwargs = {
        "eval_metric": "binary_logloss",
        "callbacks": callbacks,
    }
    if "eval_X" in sig.parameters:
        fit_kwargs["eval_X"] = X_val
        fit_kwargs["eval_y"] = y_val
    else:
        fit_kwargs["eval_set"] = [(X_val, y_val)]

    model.fit(X_train, y_train, **fit_kwargs)

    best_iter = model.best_iteration_ or model.n_estimators
    logger.info("Optimal stopping reached at iteration: %d", best_iter)

    # 4. Rigorous Evaluation
    logger.info("=== STEP 4: Evaluating Model Performance ===")
    val_probs = model.predict_proba(X_val)[:, 1]

    # Metrics
    pr_auc = float(average_precision_score(y_val, val_probs))
    roc_auc = float(roc_auc_score(y_val, val_probs))

    # Standard 0.50 threshold metrics
    preds_50 = (val_probs >= 0.50).astype(int)
    precision_50 = float(precision_score(y_val, preds_50, zero_division=0))
    recall_50 = float(recall_score(y_val, preds_50, zero_division=0))

    # Banking Decision Thresholds Evaluation:
    # MFA threshold = 0.30 (catches suspicious items early)
    preds_mfa = (val_probs >= 0.30).astype(int)
    recall_mfa = float(recall_score(y_val, preds_mfa, zero_division=0))
    precision_mfa = float(precision_score(y_val, preds_mfa, zero_division=0))

    # BLOCK threshold = 0.70 (high certainty fraud)
    preds_block = (val_probs >= 0.70).astype(int)
    recall_block = float(recall_score(y_val, preds_block, zero_division=0))
    precision_block = float(precision_score(y_val, preds_block, zero_division=0))

    logger.info("==========================================")
    logger.info("          ATM VALIDATION REPORT           ")
    logger.info("==========================================")
    logger.info("PR-AUC (Primary Imbalance Metric): %.4f", pr_auc)
    logger.info("ROC-AUC:                           %.4f", roc_auc)
    logger.info("--- Performance at Standard Threshold (0.50) ---")
    logger.info("Precision: %.4f | Recall: %.4f", precision_50, recall_50)
    logger.info("--- Performance at Operational Thresholds ---")
    logger.info(
        "MFA / Step-Up (>=0.30): Precision: %.4f | Recall: %.4f",
        precision_mfa,
        recall_mfa,
    )
    logger.info(
        "Hard Block    (>=0.70): Precision: %.4f | Recall: %.4f",
        precision_block,
        recall_block,
    )
    logger.info("Confusion Matrix (threshold=0.50):\n%s", confusion_matrix(y_val, preds_50))
    logger.info("\n%s", classification_report(y_val, preds_50, target_names=["Legit", "Fraud"]))

    # Feature Importance (Gain)
    feature_importances = dict(
        zip(
            FEATURE_COLUMNS,
            [round(float(g), 4) for g in model.feature_importances_],
        )
    )
    logger.info("Feature Importances (Gain): %s", feature_importances)

    # 5. Persist Artifacts
    logger.info("=== STEP 5: Persisting Artifacts ===")
    model_txt_path = artifacts_dir / "atm_fraud_model.txt"
    model.booster_.save_model(str(model_txt_path))
    logger.info("Saved LightGBM booster model to: %s", model_txt_path)

    features_json_path = artifacts_dir / "features.json"
    schema_metadata = {
        "features": FEATURE_COLUMNS,
        "target": TARGET_COLUMN,
        "total_features": len(FEATURE_COLUMNS),
        "model_architecture": "LightGBM Booster (ATM / Cash Withdrawal Fraud)",
        "scale_pos_weight": round(scale_pos_weight, 4),
        "best_iteration": int(best_iter),
        "metrics": {
            "pr_auc": round(pr_auc, 4),
            "roc_auc": round(roc_auc, 4),
            "precision_at_0.50": round(precision_50, 4),
            "recall_at_0.50": round(recall_50, 4),
            "recall_at_mfa_threshold_0.30": round(recall_mfa, 4),
            "precision_at_block_threshold_0.70": round(precision_block, 4),
        },
        "feature_importance_gain": feature_importances,
        "decision_thresholds": {
            "allow_below": 0.30,
            "mfa_between": [0.30, 0.70],
            "block_above": 0.70,
        },
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
    }

    with open(features_json_path, "w", encoding="utf-8") as f:
        json.dump(schema_metadata, f, indent=2)
    logger.info("Saved feature schema and training metadata to: %s", features_json_path)

    return {
        "metrics": schema_metadata["metrics"],
        "artifacts": {
            "model_path": str(model_txt_path),
            "features_path": str(features_json_path),
        },
    }


if __name__ == "__main__":
    args = parse_args()
    artifacts_dir = Path(args.artifacts_dir) if args.artifacts_dir else None
    run_training(
        data_path=args.data_path,
        artifacts_dir=artifacts_dir,
        random_state=args.random_state,
    )
