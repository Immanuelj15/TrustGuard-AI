import os
import json
import joblib
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

def train_and_evaluate_audio_models():
    print("================================================================================")
    print("            TRUSTGUARD AI — AUDIO SPOOF BASELINE MODEL TRAINING                ")
    print("================================================================================")

    splits_dir = Path("datasets/splits")
    train_path = splits_dir / "audio_train.csv"
    val_path = splits_dir / "audio_val.csv"
    test_path = splits_dir / "audio_test.csv"

    if not train_path.exists() or not test_path.exists():
        raise FileNotFoundError(f"Audio splits not found in {splits_dir}. Run preprocess_audio first.")

    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)
    test_df = pd.read_csv(test_path)

    feature_cols = [
        "spectral_centroid", "spectral_flatness", "zero_crossing_rate",
        "rms_energy", "mfcc_1", "mfcc_2", "mfcc_3", "mfcc_4", "mfcc_5"
    ]

    X_train = train_df[feature_cols].values
    y_train = train_df["label"].values

    X_test = test_df[feature_cols].values
    y_test = test_df["label"].values

    print(f"Features: {feature_cols}")
    print(f"Loaded: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

    clf = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=5)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)[:, 1] if len(np.unique(y_train)) > 1 else np.zeros(len(y_test))

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    cm = confusion_matrix(y_test, y_pred).tolist()

    print(f"\nEvaluation on Test Set:")
    print(f"  Accuracy:  {acc:.4f}")
    print(f"  Precision: {prec:.4f}")
    print(f"  Recall:    {rec:.4f}")
    print(f"  F1-Score:  {f1:.4f}")

    # Save artifact
    artifacts_dir = Path("ml/inference/artifacts")
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    model_file = artifacts_dir / "audio_classifier.joblib"
    joblib.dump({
        "model": clf,
        "feature_cols": feature_cols,
        "label_mapping": {"bonafide": 0, "spoof": 1}
    }, model_file)
    print(f"Saved audio classifier to: {model_file}")

    report = {
        "task": "Acoustic Audio Spoof Classification",
        "dataset": "ASVspoof 2021 Benchmark Protocol",
        "dataset_split": {
            "train_samples": len(train_df),
            "val_samples": len(val_df),
            "test_samples": len(test_df)
        },
        "features_used": feature_cols,
        "metrics": {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "confusion_matrix": cm
        },
        "limitations": [
            "Baseline acoustic classifier is an initial heuristic detector.",
            "Full production deployment requires loading official ASVspoof 2021 DF/LA deep neural weights."
        ]
    }

    report_path = Path("datasets/reports/audio_baseline_evaluation.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Report exported to: {report_path}")

    return report

if __name__ == "__main__":
    train_and_evaluate_audio_models()
