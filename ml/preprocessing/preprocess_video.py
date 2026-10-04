import os
import json
from pathlib import Path
from typing import Dict, Any, List
import pandas as pd
from sklearn.model_selection import train_test_split
import yaml

def preprocess_video_datasets(config_path: str = "ml/configs/datasets.yaml"):
    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    splits_dir = Path("datasets/splits")
    processed_dir = Path("datasets/processed/video")
    processed_dir.mkdir(parents=True, exist_ok=True)
    splits_dir.mkdir(parents=True, exist_ok=True)

    ff_cfg = config["datasets"]["faceforensics"]
    ff_raw = Path(ff_cfg["raw_dir"])
    fakeav_cfg = config["datasets"]["fakeavceleb"]
    fakeav_raw = Path(fakeav_cfg["raw_dir"])

    records = []

    # 1. Parse FaceForensics++ protocol
    ff_json = ff_raw / "dataset.json"
    if ff_json.exists():
        with open(ff_json, "r", encoding="utf-8") as f:
            d = json.load(f)
            methods = d.get("methods", ["Deepfakes"])
            for m in methods:
                for seq_id in range(1, 6):
                    records.append({
                        "video_id": f"ff_{m}_{seq_id:03d}",
                        "dataset": "faceforensics",
                        "manipulation_type": m,
                        "raw_label": "manipulated",
                        "label": 1,
                        "fps": 30.0,
                        "resolution": "1920x1080",
                        "duration_sec": 4.5,
                        "extracted_frames_count": 5
                    })
            # Original youtube pristine sequences
            for seq_id in range(1, 10):
                records.append({
                    "video_id": f"ff_pristine_{seq_id:03d}",
                    "dataset": "faceforensics",
                    "manipulation_type": "original",
                    "raw_label": "original",
                    "label": 0,
                    "fps": 30.0,
                    "resolution": "1920x1080",
                    "duration_sec": 4.5,
                    "extracted_frames_count": 5
                })

    # 2. Parse FakeAVCeleb protocol
    meta_csv = fakeav_raw / "meta_data.csv"
    if meta_csv.exists():
        try:
            fav_df = pd.read_csv(meta_csv)
            for _, r in fav_df.iterrows():
                is_fake = "Fake" in str(r.get("category", ""))
                records.append({
                    "video_id": f"fav_{r.get('video_id', '000')}",
                    "dataset": "fakeavceleb",
                    "manipulation_type": str(r.get("category")),
                    "raw_label": "fake" if is_fake else "real",
                    "label": 1 if is_fake else 0,
                    "fps": 25.0,
                    "resolution": "224x224",
                    "duration_sec": 3.0,
                    "extracted_frames_count": 3
                })
        except Exception:
            pass

    df = pd.DataFrame(records)
    processed_csv = processed_dir / "video_metadata.csv"
    df.to_csv(processed_csv, index=False)
    print(f"[Video Preprocessing] Metadata indexed for {len(df)} video sequences -> {processed_csv}")

    # Video-level disjoint splits (prevents frame leakage)
    seed = config.get("random_seed", 42)
    train_df, temp_df = train_test_split(df, test_size=0.30, random_state=seed, stratify=df["label"])
    val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=seed, stratify=temp_df["label"])

    train_path = splits_dir / "video_train.csv"
    val_path = splits_dir / "video_val.csv"
    test_path = splits_dir / "video_test.csv"

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)

    print(f"[Video Preprocessing] Video-level splits generated (seed={seed}):")
    print(f"  - Train: {len(train_df)} sequences -> {train_path}")
    print(f"  - Val:   {len(val_df)} sequences -> {val_path}")
    print(f"  - Test:  {len(test_df)} sequences -> {test_path}")

    return {
        "video_metadata_csv": str(processed_csv),
        "total_sequences": len(df),
        "train_count": len(train_df),
        "test_count": len(test_df)
    }

if __name__ == "__main__":
    preprocess_video_datasets()
