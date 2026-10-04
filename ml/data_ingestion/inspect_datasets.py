import os
import sys
import json
import hashlib
from pathlib import Path
from typing import Dict, Any, List
import pandas as pd
import yaml

def compute_file_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def inspect_text_dataset(dataset_path: Path) -> Dict[str, Any]:
    sms_file = dataset_path / "SMSSpamCollection"
    if not sms_file.exists():
        return {"status": "missing_data_file"}

    records = []
    with open(sms_file, "r", encoding="utf-8", errors="replace") as f:
        for idx, line in enumerate(f):
            parts = line.strip().split("\t", 1)
            if len(parts) == 2:
                records.append({"label": parts[0].strip().lower(), "text": parts[1].strip()})

    df = pd.DataFrame(records)
    total_records = len(df)
    label_distribution = df["label"].value_counts().to_dict() if total_records > 0 else {}
    missing_values = int(df["text"].isna().sum()) if total_records > 0 else 0
    duplicate_count = int(df.duplicated(subset=["text"]).sum()) if total_records > 0 else 0
    avg_length = round(float(df["text"].str.len().mean()), 2) if total_records > 0 else 0.0

    return {
        "file_inspected": str(sms_file),
        "total_records": total_records,
        "label_distribution": label_distribution,
        "missing_values": missing_values,
        "duplicate_messages": duplicate_count,
        "average_message_length_chars": avg_length,
        "sample_labels_detected": list(label_distribution.keys()),
        "integrity_check": "passed" if total_records > 0 else "failed"
    }

def inspect_audio_dataset(dataset_path: Path) -> Dict[str, Any]:
    trial_meta = dataset_path / "keys" / "LA" / "CM" / "trial_metadata.txt"
    flac_dir = dataset_path / "flac"
    
    metadata_exists = trial_meta.exists()
    labels = {}
    total_meta_records = 0
    
    if metadata_exists:
        with open(trial_meta, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                if line.startswith("#") or not line.strip():
                    continue
                parts = line.strip().split()
                total_meta_records += 1
                if len(parts) >= 2:
                    lbl = parts[-1].lower()
                    labels[lbl] = labels.get(lbl, 0) + 1

    audio_files = list(dataset_path.glob("**/*.flac")) + list(dataset_path.glob("**/*.wav"))
    
    return {
        "metadata_protocol_file": str(trial_meta) if metadata_exists else "missing",
        "protocol_records_count": total_meta_records,
        "label_distribution": labels,
        "audio_files_found": len(audio_files),
        "target_format": "FLAC / PCM WAV (16kHz mono recommended)",
        "expected_subsets": ["LA (Logical Access)", "DF (Deepfake)", "PA (Physical Access)"],
        "status": "protocol_verified" if metadata_exists else "pending_data"
    }

def inspect_multimodal_dataset(dataset_path: Path) -> Dict[str, Any]:
    meta_csv = dataset_path / "meta_data.csv"
    has_meta = meta_csv.exists()
    label_dist = {}
    record_count = 0
    
    if has_meta:
        try:
            df = pd.read_csv(meta_csv)
            record_count = len(df)
            if "category" in df.columns:
                label_dist = df["category"].value_counts().to_dict()
        except Exception:
            pass

    video_files = list(dataset_path.glob("**/*.mp4"))
    return {
        "metadata_file": str(meta_csv) if has_meta else "missing",
        "metadata_records": record_count,
        "category_distribution": label_dist,
        "video_files_found": len(video_files),
        "expected_categories": ["RealVideo-RealAudio", "RealVideo-FakeAudio", "FakeVideo-RealAudio", "FakeVideo-FakeAudio"],
        "status": "protocol_verified" if has_meta else "pending_data"
    }

def inspect_video_dataset(dataset_path: Path) -> Dict[str, Any]:
    dataset_json = dataset_path / "dataset.json"
    has_json = dataset_json.exists()
    methods = []
    
    if has_json:
        try:
            with open(dataset_json, "r", encoding="utf-8") as f:
                d = json.load(f)
                methods = d.get("methods", [])
        except Exception:
            pass

    videos = list(dataset_path.glob("**/*.mp4")) + list(dataset_path.glob("**/*.avi"))
    return {
        "benchmark_file": str(dataset_json) if has_json else "missing",
        "manipulation_methods": methods,
        "video_sequences_found": len(videos),
        "target_resolution": "1920x1080 (c23 high-quality / c40 compressed)",
        "status": "protocol_verified" if has_json else "pending_data"
    }

def main():
    print("================================================================================")
    print("                 TRUSTGUARD AI — DATASET INSPECTION & VALIDATION               ")
    print("================================================================================")

    config_path = Path("ml/configs/datasets.yaml")
    if not config_path.exists():
        print("Error: ml/configs/datasets.yaml not found.")
        sys.exit(1)

    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    inspection_results = {}
    reports_dir = Path("datasets/reports")
    reports_dir.mkdir(parents=True, exist_ok=True)

    for key, d_cfg in config.get("datasets", {}).items():
        raw_path = Path(d_cfg["raw_dir"])
        print(f"\n--- Inspecting: {d_cfg['name']} ({key}) ---")
        print(f"Path: {raw_path}")

        if not raw_path.exists():
            print("  Status: Directory does not exist!")
            inspection_results[key] = {"status": "directory_missing"}
            continue

        modality = d_cfg.get("modality")
        if modality == "text":
            info = inspect_text_dataset(raw_path)
        elif modality == "audio":
            info = inspect_audio_dataset(raw_path)
        elif modality == "multimodal":
            info = inspect_multimodal_dataset(raw_path)
        elif modality == "video":
            info = inspect_video_dataset(raw_path)
        else:
            info = {"status": "unknown_modality"}

        info["name"] = d_cfg["name"]
        info["modality"] = modality
        inspection_results[key] = info

        # Print summary
        for k, v in info.items():
            if k not in ["name", "modality"]:
                print(f"  {k}: {v}")

    # Write inspection report
    report_file = reports_dir / "inspection_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(inspection_results, f, indent=2)

    print(f"\nInspection summary successfully saved to: {report_file}")
    print("="*80)

if __name__ == "__main__":
    main()
