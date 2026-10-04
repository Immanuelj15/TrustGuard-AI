import os
import json
from pathlib import Path
from datetime import datetime, timezone
import pandas as pd

def run_comprehensive_evaluation():
    print("================================================================================")
    print("           TRUSTGUARD AI — MULTI-MODAL MODEL & DATASET EVALUATION               ")
    print("================================================================================")

    reports_dir = Path("datasets/reports")
    splits_dir = Path("datasets/splits")
    manifests_dir = Path("datasets/manifests")
    reports_dir.mkdir(parents=True, exist_ok=True)

    summary_report = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "evaluation_title": "TrustGuard AI Multi-Modal Evaluation Benchmark",
        "datasets_summary": {},
        "splits_summary": {},
        "model_evaluations": {},
        "limitations": {}
    }

    # 1. Manifests inspection
    print("\n[1/4] Aggregating Dataset Manifests...")
    for mf in manifests_dir.glob("*_manifest.json"):
        with open(mf, "r", encoding="utf-8") as f:
            data = json.load(f)
            key = data.get("dataset_key")
            summary_report["datasets_summary"][key] = {
                "name": data.get("name"),
                "status": data.get("availability_status"),
                "total_files": data.get("total_files"),
                "total_size_mb": data.get("total_size_mb"),
                "license": data.get("license")
            }
            summary_report["limitations"][key] = data.get("limitations", [])

    # 2. Splits summary
    print("[2/4] Verifying Train/Validation/Test Partitions...")
    for split_file in splits_dir.glob("*.csv"):
        df = pd.read_csv(split_file)
        split_name = split_file.stem
        summary_report["splits_summary"][split_name] = {
            "samples": len(df),
            "columns": list(df.columns),
            "label_distribution": df["label"].value_counts().to_dict() if "label" in df.columns else {}
        }

    # 3. Model Evaluations
    print("[3/4] Compiling Empirical Model Performance on Held-Out Test Sets...")
    text_eval_path = reports_dir / "text_baseline_evaluation.json"
    if text_eval_path.exists():
        with open(text_eval_path, "r", encoding="utf-8") as f:
            summary_report["model_evaluations"]["text_scam_classifier"] = json.load(f)

    audio_eval_path = reports_dir / "audio_baseline_evaluation.json"
    if audio_eval_path.exists():
        with open(audio_eval_path, "r", encoding="utf-8") as f:
            summary_report["model_evaluations"]["audio_spoof_classifier"] = json.load(f)

    summary_report["model_evaluations"]["video_deepfake_detector"] = {
        "status": "baseline_adapter_ready",
        "evaluated_dataset": "FaceForensics++",
        "evaluation_note": "Awaiting local placement of complete 50GB FaceForensics sequences by authorized user."
    }

    # 4. Write Unified JSON & Markdown Reports
    print("[4/4] Writing Reports to datasets/reports/...")
    json_path = reports_dir / "comprehensive_evaluation_report.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, indent=2)

    md_path = reports_dir / "evaluation_summary.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# TrustGuard AI — Comprehensive Model & Dataset Evaluation Summary\n\n")
        f.write(f"**Generated:** {summary_report['timestamp_utc']}\n\n")
        f.write("## 1. Dataset Status\n")
        f.write("| Dataset Key | Name | Status | Files | Size (MB) | License |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- | :--- |\n")
        for k, v in summary_report["datasets_summary"].items():
            f.write(f"| `{k}` | {v['name']} | **{v['status']}** | {v['total_files']} | {v['total_size_mb']} | {v['license']} |\n")

        f.write("\n## 2. Model Performance on Held-Out Test Sets\n")
        if "text_scam_classifier" in summary_report["model_evaluations"]:
            t_eval = summary_report["model_evaluations"]["text_scam_classifier"]["models_evaluated"]["logistic_regression"]
            f.write(f"### Text Scam Classifier (Logistic Regression / TF-IDF)\n")
            f.write(f"- **Test Accuracy:** {t_eval['accuracy'] * 100:.2f}%\n")
            f.write(f"- **Precision:** {t_eval['precision'] * 100:.2f}%\n")
            f.write(f"- **Recall:** {t_eval['recall'] * 100:.2f}%\n")
            f.write(f"- **F1-Score:** {t_eval['f1_score'] * 100:.2f}%\n")
            f.write(f"- **ROC-AUC:** {t_eval['roc_auc']:.4f}\n")
            f.write(f"- **Confusion Matrix:** `{t_eval['confusion_matrix']}`\n\n")

        if "audio_spoof_classifier" in summary_report["model_evaluations"]:
            a_eval = summary_report["model_evaluations"]["audio_spoof_classifier"]["metrics"]
            f.write(f"### Audio Spoof Classifier (Acoustic Telemetry / Random Forest)\n")
            f.write(f"- **Test Accuracy:** {a_eval['accuracy'] * 100:.2f}%\n")
            f.write(f"- **Precision:** {a_eval['precision'] * 100:.2f}%\n")
            f.write(f"- **Recall:** {a_eval['recall'] * 100:.2f}%\n")
            f.write(f"- **F1-Score:** {a_eval['f1_score'] * 100:.2f}%\n\n")

        f.write("## 3. Methodological Limitations\n")
        for k, lims in summary_report["limitations"].items():
            f.write(f"### `{k}`\n")
            for lim in lims:
                f.write(f"- {lim}\n")

    print(f"\nComprehensive reports generated:")
    print(f"  - JSON: {json_path}")
    print(f"  - Markdown: {md_path}")
    print("="*80)

if __name__ == "__main__":
    run_comprehensive_evaluation()
