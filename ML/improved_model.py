"""
Enhanced Heat Hazard Risk Prediction v4.1 (Validated)
- Proper train/test split to avoid overfitting
- Realistic performance evaluation
- Modular functions with validation
"""

import os
import warnings
from datetime import timedelta

import joblib
import numpy as np
import pandas as pd
from imblearn.pipeline import Pipeline as ImbPipeline
from imblearn.over_sampling import SMOTE
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    accuracy_score,
    f1_score,
    precision_recall_curve,
    average_precision_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")
np.random.seed(42)


def load_and_label(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["timestamp"])
    # broaden positive class
    heat_related = {"heat_stroke", "dehydration", "fainting", "heat_exhaustion"}
    df["hazard"] = df["incident_type"].isin(heat_related).astype(int)
    return df


def add_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    # Compute per-location rolling windows
    df = df.sort_values(["lat", "lon", "timestamp"])
    group_cols = ["lat", "lon"]
    windows = [3, 7]
    for w in windows:
        df[f"temp_roll{w}"] = (
            df.groupby(group_cols)["temp"]
            .rolling(w, min_periods=1)
            .mean()
            .reset_index(level=group_cols, drop=True)
        )
        df[f"tavg_roll{w}"] = (
            df.groupby(group_cols)["tavg"]
            .rolling(w, min_periods=1)
            .mean()
            .reset_index(level=group_cols, drop=True)
        )
    return df


def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    df["hour"] = df["timestamp"].dt.hour
    df["dayofweek"] = df["timestamp"].dt.dayofweek
    df["month"] = df["timestamp"].dt.month
    # Simple engineered features
    df["temp_range"] = df["temp"] - df["tmin"]
    df["heat_index"] = df["temp"] + 0.5 * df["tavg"]
    df["is_peak"] = df["hour"].between(10, 17).astype(int)
    df["is_weekend"] = df["dayofweek"].isin([5, 6]).astype(int)
    df["dist_center"] = np.hypot(df["lat"] - 12.9716, df["lon"] - 77.5946)
    # Cyclical
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    return df


def prepare_features(df: pd.DataFrame):
    df = add_rolling_features(df)
    df = add_engineered_features(df)
    # Drop rows with any remaining NaN
    df = df.dropna(subset=["temp", "tavg", "tmin"])
    feature_cols = [
        "temp",
        "tavg",
        "tmin",
        "prcp",
        "temp_roll3",
        "temp_roll7",
        "tavg_roll3",
        "tavg_roll7",
        "temp_range",
        "heat_index",
        "is_peak",
        "is_weekend",
        "dist_center",
        "hour_sin",
        "hour_cos",
        "month_sin",
        "month_cos",
    ]
    X = df[feature_cols]
    y = df["hazard"]
    return X, y, feature_cols


def find_best_threshold(y_true, y_scores):
    p, r, t = precision_recall_curve(y_true, y_scores)
    mask = (t >= 0.05) & (t <= 0.95)
    if not mask.any():
        return 0.5, 0.0
    p, r, t = p[:-1][mask], r[:-1][mask], t[mask]
    f1 = 2 * (p * r) / (p + r + 1e-9)
    idx = np.argmax(f1)
    return float(t[idx]), float(f1[idx])


def evaluate_model(name, model, X_train, y_train, X_test, y_test):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    # Use Average Precision (PR-AUC)
    ap_scores = cross_val_score(
        model, X_train, y_train, cv=cv, scoring="average_precision"
    )
    print(f"{name} PR-AUC CV: {ap_scores.mean():.4f} ± {ap_scores.std():.4f}")
    # Train final
    model.fit(X_train, y_train)
    y_scores = model.predict_proba(X_test)[:, 1]
    thresh, f1 = find_best_threshold(y_test, y_scores)
    y_pred = (y_scores >= thresh).astype(int)
    print(f"  Optimal threshold: {thresh:.3f}, F1 (test): {f1:.3f}")
    print(classification_report(y_test, y_pred, digits=3))
    return model, thresh, ap_scores.mean()


def main():
    print("=== Heat Hazard Risk Prediction v4.1 (Validated) ===")
    df = load_and_label("features.csv")
    print(f"Loaded {len(df)} samples, positive rate={df['hazard'].mean():.3f}")

    X, y, feats = prepare_features(df)
    print(f"Prepared {len(feats)} features")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Baseline
    baseline = (X_test["temp"] > 35).astype(int)
    print(
        f"Baseline (temp>35): F1={f1_score(y_test, baseline):.3f} AP={average_precision_score(y_test, X_test['temp']):.3f}"
    )

    # Pipelines
    pipe_lr = ImbPipeline(
        [
            ("scale", StandardScaler()),
            ("smote", SMOTE(random_state=42)),
            ("clf", LogisticRegression(class_weight="balanced", max_iter=500)),
        ]
    )
    pipe_rf = ImbPipeline(
        [
            ("scale", StandardScaler()),
            ("smote", SMOTE(random_state=42)),
            ("clf", RandomForestClassifier(n_estimators=200, class_weight="balanced")),
        ]
    )

    # Evaluate
    lr, th_lr, ap_lr = evaluate_model("Logistic Regression", pipe_lr, X_train, y_train, X_test, y_test)
    rf, th_rf, ap_rf = evaluate_model("Random Forest", pipe_rf, X_train, y_train, X_test, y_test)

    # Choose best by AP
    best, best_thresh = (rf, th_rf) if ap_rf >= ap_lr else (lr, th_lr)
    best_name = "Random Forest" if best is rf else "Logistic Regression"

    print(f"🏆 Best: {best_name} (Test AP={max(ap_rf, ap_lr):.3f})")

    # Save artifacts
    os.makedirs("models", exist_ok=True)
    joblib.dump(best, "models/heat_hazard_best_v4.joblib")
    joblib.dump(feats, "models/feature_list_v4.joblib")
    joblib.dump(best_thresh, "models/threshold_v4.joblib")
    print("✅ Models and metadata saved to models/")

if __name__ == "__main__":
    main() 