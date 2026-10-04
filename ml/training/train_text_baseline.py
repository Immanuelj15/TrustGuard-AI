import os
import json
import joblib
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)

def train_and_evaluate_text_models():
    print("================================================================================")
    print("            TRUSTGUARD AI — TEXT SCAM BASELINE MODEL TRAINING                  ")
    print("================================================================================")

    splits_dir = Path("datasets/splits")
    train_path = splits_dir / "text_train.csv"
    val_path = splits_dir / "text_val.csv"
    test_path = splits_dir / "text_test.csv"

    if not train_path.exists() or not test_path.exists():
        raise FileNotFoundError(f"Splits not found in {splits_dir}. Run preprocess_text first.")

    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)
    test_df = pd.read_csv(test_path)

    print(f"Loaded: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

    # 1. Feature Extraction: TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        sublinear_tf=True
    )
    X_train = vectorizer.fit_transform(train_df["text"])
    y_train = train_df["label"].values

    X_val = vectorizer.transform(val_df["text"])
    y_val = val_df["label"].values

    X_test = vectorizer.transform(test_df["text"])
    y_test = test_df["label"].values

    # 2. Train Primary Model: Logistic Regression
    print("\nTraining Model 1: Logistic Regression...")
    clf_lr = LogisticRegression(C=1.0, max_iter=1000, random_state=42)
    clf_lr.fit(X_train, y_train)

    y_pred_lr = clf_lr.predict(X_test)
    y_prob_lr = clf_lr.predict_proba(X_test)[:, 1]

    acc_lr = accuracy_score(y_test, y_pred_lr)
    prec_lr = precision_score(y_test, y_pred_lr)
    rec_lr = recall_score(y_test, y_pred_lr)
    f1_lr = f1_score(y_test, y_pred_lr)
    auc_lr = roc_auc_score(y_test, y_prob_lr)
    cm_lr = confusion_matrix(y_test, y_pred_lr).tolist()

    print(f"  Accuracy:  {acc_lr:.4f}")
    print(f"  Precision: {prec_lr:.4f}")
    print(f"  Recall:    {rec_lr:.4f}")
    print(f"  F1-Score:  {f1_lr:.4f}")
    print(f"  ROC-AUC:   {auc_lr:.4f}")

    # 3. Train Comparison Model: Linear SVM
    print("\nTraining Model 2: Linear SVM...")
    clf_svm = LinearSVC(C=1.0, random_state=42, max_iter=2000)
    clf_svm.fit(X_train, y_train)

    y_pred_svm = clf_svm.predict(X_test)
    acc_svm = accuracy_score(y_test, y_pred_svm)
    prec_svm = precision_score(y_test, y_pred_svm)
    rec_svm = recall_score(y_test, y_pred_svm)
    f1_svm = f1_score(y_test, y_pred_svm)
    cm_svm = confusion_matrix(y_test, y_pred_svm).tolist()

    print(f"  Accuracy:  {acc_svm:.4f}")
    print(f"  Precision: {prec_svm:.4f}")
    print(f"  Recall:    {rec_svm:.4f}")
    print(f"  F1-Score:  {f1_svm:.4f}")

    # 4. Save Artifacts for Inference Integration
    artifacts_dir = Path("ml/inference/artifacts")
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    model_file = artifacts_dir / "text_classifier.joblib"
    vectorizer_file = artifacts_dir / "text_vectorizer.joblib"
    joblib.dump(clf_lr, model_file)
    joblib.dump(vectorizer, vectorizer_file)
    print(f"\nTrained artifacts saved to:\n  - {model_file}\n  - {vectorizer_file}")

    # 5. Export Evaluation Report
    report = {
        "task": "SMS Scam & Spam Binary Classification",
        "dataset": "UCI SMS Spam Collection",
        "dataset_split": {
            "train_samples": len(train_df),
            "val_samples": len(val_df),
            "test_samples": len(test_df)
        },
        "models_evaluated": {
            "logistic_regression": {
                "accuracy": round(acc_lr, 4),
                "precision": round(prec_lr, 4),
                "recall": round(rec_lr, 4),
                "f1_score": round(f1_lr, 4),
                "roc_auc": round(auc_lr, 4),
                "confusion_matrix": cm_lr
            },
            "linear_svm": {
                "accuracy": round(acc_svm, 4),
                "precision": round(prec_svm, 4),
                "recall": round(rec_svm, 4),
                "f1_score": round(f1_svm, 4),
                "confusion_matrix": cm_svm
            }
        },
        "best_model": "logistic_regression",
        "limitations": [
            "Trained on British English SMS spam corpus; requires Indian financial fraud context augmentation.",
            "Must be used in tandem with TrustGuard rule-based domain indicators."
        ]
    }

    report_path = Path("datasets/reports/text_baseline_evaluation.json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Report exported to: {report_path}")

    return report

if __name__ == "__main__":
    train_and_evaluate_text_models()
