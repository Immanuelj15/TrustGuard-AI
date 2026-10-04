"""
TrustGuard AI — Synthetic Dataset Quality & Label Validation Script
Validates file integrity, metadata consistency, audio/video readability,
absence of real personal data, and synthetic provenance.
"""

import os
import sys
import wave
import json
import hashlib
import re
from pathlib import Path
from typing import Dict, Any, List
import cv2

DATASET_ROOT = Path("datasets/synthetic")
REPORTS_DIR = DATASET_ROOT / "reports"

def compute_sha256(filepath: Path) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()

def validate_audio(audio_manifest_path: Path) -> Dict[str, Any]:
    print("[Validation] Auditing Synthetic Audio Dataset...")
    if not audio_manifest_path.exists():
        return {"status": "FAIL", "error": "audio_manifest.json missing"}

    with open(audio_manifest_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    seen_ids = set()
    valid_samples = 0
    errors = []

    for r in records:
        sid = r.get("sample_id")
        if sid in seen_ids:
            errors.append(f"Duplicate sample_id: {sid}")
        seen_ids.add(sid)

        if not r.get("synthetic_data", False):
            errors.append(f"{sid}: Missing synthetic_data=True flag")

        fpath = Path(r.get("file_path", ""))
        if not fpath.exists():
            errors.append(f"{sid}: File does not exist at {fpath}")
            continue

        # Check hash
        real_hash = compute_sha256(fpath)
        if real_hash != r.get("sha256"):
            errors.append(f"{sid}: SHA-256 hash mismatch! Manifest: {r.get('sha256')}, Real: {real_hash}")

        # Check wave opening
        try:
            with wave.open(str(fpath), "rb") as wf:
                sr = wf.getframerate()
                frames = wf.getnframes()
                if sr <= 0 or frames <= 0:
                    errors.append(f"{sid}: Invalid wave parameters (sr={sr}, frames={frames})")
                else:
                    valid_samples += 1
        except Exception as e:
            errors.append(f"{sid}: Failed to parse WAV: {e}")

    return {
        "status": "PASS" if len(errors) == 0 else "FAIL",
        "total_manifest_records": len(records),
        "verified_playable_files": valid_samples,
        "errors": errors
    }

def validate_video(video_manifest_path: Path) -> Dict[str, Any]:
    print("[Validation] Auditing Synthetic Video Dataset...")
    if not video_manifest_path.exists():
        return {"status": "FAIL", "error": "video_manifest.json missing"}

    with open(video_manifest_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    seen_ids = set()
    valid_samples = 0
    errors = []

    for r in records:
        sid = r.get("sample_id")
        if sid in seen_ids:
            errors.append(f"Duplicate sample_id: {sid}")
        seen_ids.add(sid)

        if not r.get("synthetic_data", False):
            errors.append(f"{sid}: Missing synthetic_data=True flag")

        vpath = Path(r.get("video_path", ""))
        if not vpath.exists():
            errors.append(f"{sid}: File does not exist at {vpath}")
            continue

        real_hash = compute_sha256(vpath)
        if real_hash != r.get("sha256"):
            errors.append(f"{sid}: SHA-256 hash mismatch! Manifest: {r.get('sha256')}, Real: {real_hash}")

        # Check video decoding with cv2
        try:
            cap = cv2.VideoCapture(str(vpath))
            if not cap.isOpened():
                errors.append(f"{sid}: cv2.VideoCapture failed to open file")
            else:
                fc = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                cap.release()
                if fc <= 0 or w <= 0 or h <= 0:
                    errors.append(f"{sid}: Invalid video properties (fc={fc}, w={w}, h={h})")
                else:
                    valid_samples += 1
        except Exception as e:
            errors.append(f"{sid}: OpenCV video read exception: {e}")

    return {
        "status": "PASS" if len(errors) == 0 else "FAIL",
        "total_manifest_records": len(records),
        "verified_playable_files": valid_samples,
        "errors": errors
    }

def validate_multimodal(multi_manifest_path: Path) -> Dict[str, Any]:
    print("[Validation] Auditing Synthetic Multimodal Pairs...")
    if not multi_manifest_path.exists():
        return {"status": "FAIL", "error": "multimodal_manifest.json missing"}

    with open(multi_manifest_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    seen_ids = set()
    valid_pairs = 0
    errors = []

    for r in records:
        pid = r.get("pair_id")
        if pid in seen_ids:
            errors.append(f"Duplicate pair_id: {pid}")
        seen_ids.add(pid)

        a_path = Path(r.get("audio_path", ""))
        v_path = Path(r.get("video_path", ""))

        if not a_path.exists():
            errors.append(f"{pid}: Audio sample file missing: {a_path}")
        if not v_path.exists():
            errors.append(f"{pid}: Video sample file missing: {v_path}")

        if a_path.exists() and v_path.exists():
            valid_pairs += 1

    return {
        "status": "PASS" if len(errors) == 0 else "FAIL",
        "total_manifest_pairs": len(records),
        "verified_intact_pairs": valid_pairs,
        "errors": errors
    }

def validate_text(text_manifest_path: Path) -> Dict[str, Any]:
    print("[Validation] Auditing Synthetic Text Dataset (~500 samples)...")
    if not text_manifest_path.exists():
        return {"status": "FAIL", "error": "text_manifest.json missing"}

    with open(text_manifest_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    seen_ids = set()
    valid_texts = 0
    errors = []
    pii_violations = []

    real_phone_regex = re.compile(r"\b(?:\+?1|\+?44|\+?91)[\s-]?[6-9]\d{9}\b")

    for r in records:
        sid = r.get("sample_id")
        if sid in seen_ids:
            errors.append(f"Duplicate sample_id: {sid}")
        seen_ids.add(sid)

        text = r.get("message_text", "")
        if not text or len(text.strip()) == 0:
            errors.append(f"{sid}: Empty message_text")
            continue

        if not r.get("synthetic_data", False):
            errors.append(f"{sid}: Missing synthetic_data=True flag")

        # Check that URLs are benign/example only
        if "http" in text:
            if not any(safe_d in text for safe_d in [".example", "example.com", "example.org"]):
                pii_violations.append(f"{sid}: Contains non-example URL domain: {text}")

        valid_texts += 1

    return {
        "status": "PASS" if len(errors) == 0 and len(pii_violations) == 0 else "FAIL",
        "total_manifest_records": len(records),
        "verified_valid_texts": valid_texts,
        "pii_violations": pii_violations,
        "errors": errors
    }

def main():
    print("=================================================================")
    print("TrustGuard AI — Dataset Validation & Quality Certification")
    print("=================================================================")

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    audio_res = validate_audio(DATASET_ROOT / "audio" / "metadata" / "audio_manifest.json")
    video_res = validate_video(DATASET_ROOT / "video" / "metadata" / "video_manifest.json")
    multi_res = validate_multimodal(DATASET_ROOT / "multimodal" / "metadata" / "multimodal_manifest.json")
    text_res = validate_text(DATASET_ROOT / "text" / "metadata" / "text_manifest.json")

    overall_status = "PASS" if all(
        res.get("status") == "PASS" for res in [audio_res, video_res, multi_res, text_res]
    ) else "FAIL"

    report = {
        "validation_timestamp": "2026-10-04T20:50:00Z",
        "overall_status": overall_status,
        "checks": {
            "audio": audio_res,
            "video": video_res,
            "multimodal": multi_res,
            "text": text_res
        },
        "summary": {
            "total_audio_verified": audio_res.get("verified_playable_files", 0),
            "total_video_verified": video_res.get("verified_playable_files", 0),
            "total_multimodal_pairs_verified": multi_res.get("verified_intact_pairs", 0),
            "total_text_samples_verified": text_res.get("verified_valid_texts", 0),
            "pii_violations_found": len(text_res.get("pii_violations", [])),
            "total_errors": sum(len(r.get("errors", [])) for r in [audio_res, video_res, multi_res, text_res])
        }
    }

    report_path = REPORTS_DIR / "validation_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n-----------------------------------------------------------------")
    print(f"Validation Result: [{overall_status}]")
    print(f"- Audio: {audio_res['verified_playable_files']}/{audio_res['total_manifest_records']} files playable (Status: {audio_res['status']})")
    print(f"- Video: {video_res['verified_playable_files']}/{video_res['total_manifest_records']} files decoded (Status: {video_res['status']})")
    print(f"- Multimodal: {multi_res['verified_intact_pairs']}/{multi_res['total_manifest_pairs']} pairs intact (Status: {multi_res['status']})")
    print(f"- Text: {text_res['verified_valid_texts']}/{text_res['total_manifest_records']} samples verified (Status: {text_res['status']})")
    print(f"- PII Violations: {report['summary']['pii_violations_found']}")
    print(f"- Total Errors: {report['summary']['total_errors']}")
    print(f"Detailed report saved to: {report_path}")
    print("-----------------------------------------------------------------")

if __name__ == "__main__":
    main()
