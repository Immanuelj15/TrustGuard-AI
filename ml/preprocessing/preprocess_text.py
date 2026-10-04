import os
import re
import argparse
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split
import yaml

def clean_text_for_modeling(text: str) -> str:
    """
    Cleans raw SMS message text while deliberately preserving key scam indicators
    such as URLs, currency symbols, phone numbers, and urgent keywords.
    """
    if not isinstance(text, str):
        return ""
    
    # Normalize multiple whitespace
    cleaned = re.sub(r'\s+', ' ', text).strip()
    return cleaned

def preprocess_sms_dataset(config_path: str = "ml/configs/datasets.yaml"):
    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    d_cfg = config["datasets"]["uci_sms_spam"]
    raw_file = Path(d_cfg["raw_dir"]) / "SMSSpamCollection"
    processed_dir = Path(d_cfg["processed_dir"])
    splits_dir = Path("datasets/splits")
    processed_dir.mkdir(parents=True, exist_ok=True)
    splits_dir.mkdir(parents=True, exist_ok=True)

    if not raw_file.exists():
        raise FileNotFoundError(f"Raw SMS file not found at {raw_file}. Run prepare_datasets first.")

    print(f"[Text Preprocessing] Ingesting raw messages from {raw_file}...")
    records = []
    with open(raw_file, "r", encoding="utf-8", errors="replace") as f:
        for idx, line in enumerate(f):
            parts = line.strip().split("\t", 1)
            if len(parts) == 2:
                raw_lbl = parts[0].strip().lower()
                msg = parts[1].strip()
                if raw_lbl in ["ham", "spam"] and len(msg) > 0:
                    records.append({
                        "message_id": f"sms_{idx:05d}",
                        "raw_label": raw_lbl,
                        "label": 1 if raw_lbl == "spam" else 0,
                        "text": clean_text_for_modeling(msg),
                        "char_length": len(msg)
                    })

    df = pd.DataFrame(records)
    print(f"[Text Preprocessing] Extracted {len(df)} valid records. (Spam: {(df['label'] == 1).sum()}, Ham: {(df['label'] == 0).sum()})")

    # Export unified clean processed dataset
    processed_csv = processed_dir / "processed_sms_spam.csv"
    df.to_csv(processed_csv, index=False)
    print(f"[Text Preprocessing] Processed CSV saved to: {processed_csv}")

    # Create stratified, reproducible Train/Val/Test splits (70/15/15)
    seed = config.get("random_seed", 42)
    split_ratios = d_cfg.get("split_ratio", {"train": 0.70, "val": 0.15, "test": 0.15})

    train_df, temp_df = train_test_split(
        df,
        test_size=(split_ratios["val"] + split_ratios["test"]),
        random_state=seed,
        stratify=df["label"]
    )

    val_ratio_adjusted = split_ratios["val"] / (split_ratios["val"] + split_ratios["test"])
    val_df, test_df = train_test_split(
        temp_df,
        test_size=(1.0 - val_ratio_adjusted),
        random_state=seed,
        stratify=temp_df["label"]
    )

    train_path = splits_dir / "text_train.csv"
    val_path = splits_dir / "text_val.csv"
    test_path = splits_dir / "text_test.csv"

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)

    print(f"[Text Preprocessing] Splits generated with random_seed={seed}:")
    print(f"  - Train: {len(train_df)} samples -> {train_path}")
    print(f"  - Val:   {len(val_df)} samples -> {val_path}")
    print(f"  - Test:  {len(test_df)} samples -> {test_path}")

    return {
        "processed_csv": str(processed_csv),
        "train_count": len(train_df),
        "val_count": len(val_df),
        "test_count": len(test_df)
    }

if __name__ == "__main__":
    preprocess_sms_dataset()
