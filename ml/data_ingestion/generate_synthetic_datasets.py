"""
TrustGuard AI — Synthetic Demonstration Dataset Generator
Programmatically generates safe, reproducible, clearly-labelled synthetic datasets
for text scam classification, audio telemetry, video frame analysis, and multimodal pairing.

IMPORTANT: This is synthetic demonstration data for academic and platform testing.
Never represent synthetic data as real-world evidence or claim real-world model accuracy.
"""

import os
import sys
import wave
import json
import csv
import hashlib
import random
import struct
from pathlib import Path
from typing import Dict, Any, List, Tuple
import numpy as np
import cv2
import pyttsx3
from scipy import signal

# Seed for reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

DATASET_ROOT = Path("datasets/synthetic")

def compute_sha256(filepath: Path) -> str:
    """Computes SHA-256 cryptographic digest of a file."""
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()

# ==============================================================================
# PHASE 3: SYNTHETIC AUDIO GENERATOR
# ==============================================================================

AUDIO_SENTENCES = [
    # General conversational / banking / security messages
    "Good morning. This is an automated update regarding your account security settings.",
    "Your package has arrived at the local distribution facility and will be delivered today.",
    "Please verify the appointment time with your healthcare coordinator before noon.",
    "Thank you for reaching out to customer support. Your inquiry ticket has been logged.",
    "The meeting has been rescheduled to tomorrow at ten o'clock in the conference room.",
    "We have noticed unusual activity on your card ending with four three two one.",
    "This is Officer Vikram from the central enforcement directorate regarding a formal notice.",
    "Kindly update your residential address details in the citizen portal to proceed.",
    "Urgent notification: Your outgoing services will be suspended unless verification is completed.",
    "Your online payment of four thousand two hundred rupees was received successfully.",
    "Attention: An urgent court warrant has been issued in your name under section four twenty.",
    "Please do not share your one-time verification password with anyone, including bank staff.",
    "A parcel shipped from Mumbai containing suspicious documentation has been intercepted.",
    "Congratulations, you have been selected for the international digital commerce prize.",
    "This call is being recorded for official quality and investigative compliance records."
]

def apply_audio_transformations(samples: np.ndarray, sample_rate: int, transform_type: str) -> Tuple[np.ndarray, int]:
    """Applies controlled transformations for synthetic audio testing."""
    samples_float = samples.astype(np.float32)
    max_amp = np.max(np.abs(samples_float)) if len(samples_float) > 0 else 1.0
    if max_amp > 0:
        samples_float /= max_amp

    if transform_type == "speed_up":
        # Resample to simulate fast playback (1.25x speed)
        num_target_samples = int(len(samples_float) / 1.25)
        transformed = signal.resample(samples_float, num_target_samples)
        return (transformed * 32767).astype(np.int16), sample_rate

    elif transform_type == "slow_down":
        # Resample to simulate slow speech (0.85x speed)
        num_target_samples = int(len(samples_float) / 0.85)
        transformed = signal.resample(samples_float, num_target_samples)
        return (transformed * 32767).astype(np.int16), sample_rate

    elif transform_type == "noise_injection":
        # Additive white Gaussian noise (simulating VoIP line noise)
        noise = np.random.normal(0, 0.05, len(samples_float)).astype(np.float32)
        transformed = np.clip(samples_float + noise, -1.0, 1.0)
        return (transformed * 32767).astype(np.int16), sample_rate

    elif transform_type == "high_pass_telephony":
        # Simple telephony bandpass filter (300Hz - 3400Hz filter simulation)
        sos = signal.butter(4, [300, 3400], btype='bandpass', fs=sample_rate, output='sos')
        filtered = signal.sosfilt(sos, samples_float)
        filtered = np.clip(filtered, -1.0, 1.0)
        return (filtered * 32767).astype(np.int16), sample_rate

    elif transform_type == "pitch_modulation":
        # Artificial frequency distortion via mild harmonic modulation
        t = np.linspace(0, len(samples_float) / sample_rate, len(samples_float))
        modulator = 1.0 + 0.15 * np.sin(2 * np.pi * 5.0 * t) # 5Hz vibrato-like flutter
        transformed = np.clip(samples_float * modulator, -1.0, 1.0)
        return (transformed * 32767).astype(np.int16), sample_rate

    elif transform_type == "quantization_artifact":
        # 8-bit mu-law like rough quantization
        steps = 32
        transformed = np.round(samples_float * steps) / steps
        return (transformed * 32767).astype(np.int16), sample_rate

    return samples, sample_rate

def generate_synthetic_audio_dataset() -> List[Dict[str, Any]]:
    """Generates synthetic bona-fide and transformed audio samples using local TTS."""
    print("\n--- [Phase 3] Generating Synthetic Audio Dataset ---")
    audio_dir = DATASET_ROOT / "audio"
    bonafide_dir = audio_dir / "bona_fide"
    transformed_dir = audio_dir / "synthetic_or_transformed"
    meta_dir = audio_dir / "metadata"

    for d in [bonafide_dir, transformed_dir, meta_dir]:
        d.mkdir(parents=True, exist_ok=True)

    engine = pyttsx3.init()
    voices = engine.getProperty('voices')
    voice_ids = [v.id for v in voices] if voices else [None]

    audio_manifest = []
    sample_counter = 1

    # 1. Generate Bona-fide like clean TTS samples
    print(f"Generating clean synthetic TTS samples (target: {len(AUDIO_SENTENCES)} samples)...")
    for i, text in enumerate(AUDIO_SENTENCES):
        sample_id = f"SYNTH_AUD_CLEAN_{sample_counter:03d}"
        filename = f"{sample_id}.wav"
        filepath = bonafide_dir / filename

        # Alternate voices
        voice_id = voice_ids[i % len(voice_ids)]
        if voice_id:
            engine.setProperty('voice', voice_id)
        engine.setProperty('rate', 160 + (i % 3) * 15) # Vary rate slightly

        engine.save_to_file(text, str(filepath))
        engine.runAndWait()

        # Read wave file to obtain real duration and sample rate
        duration = 0.0
        sample_rate = 22050
        channels = 1
        if filepath.exists():
            with wave.open(str(filepath), 'rb') as wf:
                sample_rate = wf.getframerate()
                channels = wf.getnchannels()
                frames = wf.getnframes()
                duration = round(frames / float(sample_rate), 2)

        record = {
            "sample_id": sample_id,
            "file_path": str(filepath).replace("\\", "/"),
            "filename": filename,
            "label": "synthetic_clean_demo",
            "modality": "audio",
            "generation_method": "pyttsx3_local_tts",
            "voice_index": i % len(voice_ids),
            "source_text": text,
            "sample_rate": sample_rate,
            "duration_seconds": duration,
            "channels": channels,
            "transformation_applied": "none",
            "dataset_version": "v1.0-synthetic-demo",
            "sha256": compute_sha256(filepath) if filepath.exists() else "",
            "synthetic_data": True
        }
        audio_manifest.append(record)
        sample_counter += 1

    # 2. Generate Transformed synthetic samples
    transforms = [
        "speed_up",
        "slow_down",
        "noise_injection",
        "high_pass_telephony",
        "pitch_modulation",
        "quantization_artifact"
    ]
    print(f"Generating transformed audio samples with controlled acoustic artifacts...")
    for i, t_type in enumerate(transforms):
        text = AUDIO_SENTENCES[i % len(AUDIO_SENTENCES)]
        sample_id = f"SYNTH_AUD_TRANS_{sample_counter:03d}"
        filename = f"{sample_id}.wav"
        filepath = transformed_dir / filename

        # First generate raw TTS
        temp_raw = transformed_dir / f"temp_{sample_id}.wav"
        voice_id = voice_ids[(i + 1) % len(voice_ids)]
        if voice_id:
            engine.setProperty('voice', voice_id)
        engine.setProperty('rate', 150)
        engine.save_to_file(text, str(temp_raw))
        engine.runAndWait()

        if temp_raw.exists():
            with wave.open(str(temp_raw), 'rb') as wf:
                sr = wf.getframerate()
                ch = wf.getnchannels()
                sw = wf.getsampwidth()
                frames = wf.readframes(wf.getnframes())
                if sw == 2:
                    samples = np.frombuffer(frames, dtype=np.int16)
                else:
                    samples = np.frombuffer(frames, dtype=np.uint8).astype(np.int16)

            transformed_samples, out_sr = apply_audio_transformations(samples, sr, t_type)

            with wave.open(str(filepath), 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(out_sr)
                wf.writeframes(transformed_samples.tobytes())

            temp_raw.unlink(missing_ok=True)
            duration = round(len(transformed_samples) / float(out_sr), 2)
        else:
            duration = 2.5
            out_sr = 16000
            ch = 1

        record = {
            "sample_id": sample_id,
            "file_path": str(filepath).replace("\\", "/"),
            "filename": filename,
            "label": "synthetic_transformed_demo",
            "modality": "audio",
            "generation_method": "pyttsx3_tts_with_scipy_signal_transforms",
            "voice_index": (i + 1) % len(voice_ids),
            "source_text": text,
            "sample_rate": out_sr,
            "duration_seconds": duration,
            "channels": 1,
            "transformation_applied": t_type,
            "dataset_version": "v1.0-synthetic-demo",
            "sha256": compute_sha256(filepath) if filepath.exists() else "",
            "synthetic_data": True
        }
        audio_manifest.append(record)
        sample_counter += 1

    # Save audio manifests
    json_path = meta_dir / "audio_manifest.json"
    csv_path = meta_dir / "audio_manifest.csv"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(audio_manifest, f, indent=2)

    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(audio_manifest[0].keys()))
        writer.writeheader()
        writer.writerows(audio_manifest)

    print(f"Generated {len(audio_manifest)} synthetic audio files. Manifest saved to {json_path}")
    return audio_manifest

# ==============================================================================
# PHASE 4: SYNTHETIC VIDEO DEMO GENERATOR
# ==============================================================================

def create_synthetic_frame(
    width: int,
    height: int,
    frame_idx: int,
    total_frames: int,
    title: str,
    subject_type: str = "presenter",
    artifact: str = "none"
) -> np.ndarray:
    """Renders a single synthetic presentation/avatar frame with geometric features and timestamps."""
    frame = np.full((height, width, 3), (248, 250, 252), dtype=np.uint8) # Slate-50 background

    # Top header bar (Blue #2563EB)
    cv2.rectangle(frame, (0, 0), (width, 40), (235, 99, 37), -1) # BGR (37, 99, 235)
    cv2.putText(frame, "TRUSTGUARD AI - SYNTHETIC DEMO STREAM", (15, 26),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2, cv2.LINE_AA)

    # Frame index & timestamp
    sec = frame_idx / 10.0
    time_str = f"T: {sec:.1f}s | Frame: {frame_idx:03d}/{total_frames:03d}"
    cv2.putText(frame, time_str, (width - 230, 26),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (240, 240, 240), 1, cv2.LINE_AA)

    # Center card (White with border)
    cv2.rectangle(frame, (30, 60), (width - 30, height - 40), (255, 255, 255), -1)
    cv2.rectangle(frame, (30, 60), (width - 30, height - 40), (226, 232, 240), 2)

    # Geometric Presenter Avatar representation
    avatar_cx = 100
    avatar_cy = 135
    # Head & Shoulders
    cv2.ellipse(frame, (avatar_cx, avatar_cy + 45), (45, 30), 0, 0, 180, (219, 234, 254), -1) # shoulders
    cv2.circle(frame, (avatar_cx, avatar_cy), 28, (191, 219, 254), -1) # head
    cv2.circle(frame, (avatar_cx, avatar_cy), 28, (37, 99, 235), 2)

    # Dynamic animated facial cues (Blink / Mouth movement simulation)
    eye_offset = 10
    mouth_open = int(4 * abs(np.sin(frame_idx * 0.4)))
    # Eyes
    cv2.circle(frame, (avatar_cx - eye_offset, avatar_cy - 4), 3, (15, 23, 42), -1)
    cv2.circle(frame, (avatar_cx + eye_offset, avatar_cy - 4), 3, (15, 23, 42), -1)
    # Mouth
    cv2.ellipse(frame, (avatar_cx, avatar_cy + 12), (7, max(1, mouth_open)), 0, 0, 360, (30, 41, 59), -1)

    # Title & Incident Description text on right side
    cv2.putText(frame, title[:26], (170, 95),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (15, 23, 42), 2, cv2.LINE_AA)
    cv2.putText(frame, f"Subject: {subject_type}", (170, 125),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 116, 139), 1, cv2.LINE_AA)
    cv2.putText(frame, "Cues: Synthetic Face Model", (170, 150),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (100, 116, 139), 1, cv2.LINE_AA)

    # Watermark indicator
    cv2.putText(frame, "[SYNTHETIC DEMO EVIDENCE - NOT A REAL PERSON]", (40, height - 52),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (150, 40, 40), 1, cv2.LINE_AA)

    # Apply synthetic transformations/artifacts
    if artifact == "compression_blur":
        frame = cv2.GaussianBlur(frame, (7, 7), 2.5)
    elif artifact == "brightness_shift":
        shift = int(35 * np.sin(frame_idx * 0.5))
        frame = np.clip(frame.astype(np.int16) + shift, 0, 255).astype(np.uint8)
    elif artifact == "boundary_distortion":
        # Draw deliberate box artifact around avatar face
        cv2.rectangle(frame, (avatar_cx - 32, avatar_cy - 32), (avatar_cx + 32, avatar_cy + 32), (0, 0, 220), 1)

    return frame

def generate_synthetic_video_dataset() -> List[Dict[str, Any]]:
    """Generates synthetic video demonstration samples using OpenCV VideoWriter."""
    print("\n--- [Phase 4] Generating Synthetic Video Dataset ---")
    video_dir = DATASET_ROOT / "video"
    original_dir = video_dir / "original"
    transformed_dir = video_dir / "synthetic_or_transformed"
    meta_dir = video_dir / "metadata"

    for d in [original_dir, transformed_dir, meta_dir]:
        d.mkdir(parents=True, exist_ok=True)

    video_manifest = []
    sample_counter = 1

    width, height = 480, 270
    fps = 10.0
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')

    video_scenarios = [
        ("SYNTH_VID_ORIG_001", "Digital Arrest Summon Notice", "official_avatar", "none", original_dir, "synthetic_original_demo"),
        ("SYNTH_VID_ORIG_002", "Telecom KYC Verification", "customer_support", "none", original_dir, "synthetic_original_demo"),
        ("SYNTH_VID_ORIG_003", "Court Virtual Hearing Room", "investigator_avatar", "none", original_dir, "synthetic_original_demo"),
        ("SYNTH_VID_TRANS_004", "Compressed Telephony Stream", "suspect_interview", "compression_blur", transformed_dir, "synthetic_transformed_demo"),
        ("SYNTH_VID_TRANS_005", "Unstable Lighting Stream", "witness_briefing", "brightness_shift", transformed_dir, "synthetic_transformed_demo"),
        ("SYNTH_VID_TRANS_006", "Boundary Artifact Video", "synthetic_deepfake_test", "boundary_distortion", transformed_dir, "synthetic_transformed_demo"),
    ]

    for sample_id, title, subj, artifact, target_dir, label in video_scenarios:
        filename = f"{sample_id}.mp4"
        filepath = target_dir / filename
        total_frames = 30 # 3.0 seconds at 10 fps

        writer = cv2.VideoWriter(str(filepath), fourcc, fps, (width, height))
        for f_idx in range(total_frames):
            frame = create_synthetic_frame(width, height, f_idx, total_frames, title, subj, artifact)
            writer.write(frame)
        writer.release()

        record = {
            "sample_id": sample_id,
            "video_path": str(filepath).replace("\\", "/"),
            "filename": filename,
            "label": label,
            "modality": "video",
            "generation_method": "opencv_synthetic_frame_generator",
            "scenario_title": title,
            "frame_count": total_frames,
            "fps": fps,
            "resolution": f"{width}x{height}",
            "duration_seconds": round(total_frames / fps, 2),
            "transformation_applied": artifact,
            "dataset_version": "v1.0-synthetic-demo",
            "sha256": compute_sha256(filepath) if filepath.exists() else "",
            "synthetic_data": True
        }
        video_manifest.append(record)
        sample_counter += 1

    json_path = meta_dir / "video_manifest.json"
    csv_path = meta_dir / "video_manifest.csv"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(video_manifest, f, indent=2)

    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(video_manifest[0].keys()))
        writer.writeheader()
        writer.writerows(video_manifest)

    print(f"Generated {len(video_manifest)} synthetic video files. Manifest saved to {json_path}")
    return video_manifest

# ==============================================================================
# PHASE 5: SYNTHETIC MULTIMODAL DATASET
# ==============================================================================

def generate_synthetic_multimodal_dataset(
    audio_manifest: List[Dict[str, Any]],
    video_manifest: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Pairs synthetic audio and video samples to test multimodal synchronization workflows."""
    print("\n--- [Phase 5] Generating Synthetic Multimodal Dataset ---")
    multi_dir = DATASET_ROOT / "multimodal"
    paired_dir = multi_dir / "paired_samples"
    meta_dir = multi_dir / "metadata"

    for d in [paired_dir, meta_dir]:
        d.mkdir(parents=True, exist_ok=True)

    multimodal_manifest = []

    # Pair 1: Synchronized clean demo pair
    multimodal_manifest.append({
        "pair_id": "SYNTH_PAIR_001",
        "audio_sample_id": audio_manifest[0]["sample_id"],
        "audio_path": audio_manifest[0]["file_path"],
        "video_sample_id": video_manifest[0]["sample_id"],
        "video_path": video_manifest[0]["video_path"],
        "synchronization_status": "synchronized",
        "audio_duration": audio_manifest[0]["duration_seconds"],
        "video_duration": video_manifest[0]["duration_seconds"],
        "duration_delta": round(abs(audio_manifest[0]["duration_seconds"] - video_manifest[0]["duration_seconds"]), 2),
        "label": "synthetic_multimodal_synchronized",
        "generation_method": "paired_audio_video_telemetry",
        "synthetic_data": True
    })

    # Pair 2: Synchronized transformed pair
    multimodal_manifest.append({
        "pair_id": "SYNTH_PAIR_002",
        "audio_sample_id": audio_manifest[15]["sample_id"],
        "audio_path": audio_manifest[15]["file_path"],
        "video_sample_id": video_manifest[3]["sample_id"],
        "video_path": video_manifest[3]["video_path"],
        "synchronization_status": "synchronized",
        "audio_duration": audio_manifest[15]["duration_seconds"],
        "video_duration": video_manifest[3]["duration_seconds"],
        "duration_delta": round(abs(audio_manifest[15]["duration_seconds"] - video_manifest[3]["duration_seconds"]), 2),
        "label": "synthetic_multimodal_transformed",
        "generation_method": "paired_audio_video_telemetry",
        "synthetic_data": True
    })

    # Pair 3: Intentionally mismatched demo pair (to test desync / dubbing inconsistency detection)
    multimodal_manifest.append({
        "pair_id": "SYNTH_PAIR_003_MISMATCHED",
        "audio_sample_id": audio_manifest[1]["sample_id"],
        "audio_path": audio_manifest[1]["file_path"],
        "video_sample_id": video_manifest[5]["sample_id"],
        "video_path": video_manifest[5]["video_path"],
        "synchronization_status": "mismatched",
        "audio_duration": audio_manifest[1]["duration_seconds"],
        "video_duration": video_manifest[5]["duration_seconds"],
        "duration_delta": round(abs(audio_manifest[1]["duration_seconds"] - video_manifest[5]["duration_seconds"]), 2),
        "label": "synthetic_multimodal_mismatched",
        "generation_method": "deliberate_desynchronized_pairing",
        "synthetic_data": True
    })

    # Save manifest
    json_path = meta_dir / "multimodal_manifest.json"
    csv_path = meta_dir / "multimodal_manifest.csv"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(multimodal_manifest, f, indent=2)

    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(multimodal_manifest[0].keys()))
        writer.writeheader()
        writer.writerows(multimodal_manifest)

    print(f"Generated {len(multimodal_manifest)} multimodal pair manifests. Saved to {json_path}")
    return multimodal_manifest

# ==============================================================================
# PHASE 6: SYNTHETIC SCAM MESSAGE DATASET (~500 BALANCED SAMPLES)
# ==============================================================================

# Templates for synthetic legitimate messages
LEGIT_TEMPLATES = [
    # Delivery
    "Your package with tracking number TRK-{code} from Courier Express is out for delivery with driver Rahul.",
    "Order #{code} has been delivered to your front desk. Thank you for shopping with us.",
    "Your grocery order #{code} is packed and scheduled for delivery between 4 PM and 6 PM today.",
    "Shipment update: Package #{code} has cleared the regional hub and is moving on schedule.",
    "Your requested invoice for purchase #{code} is available for download in your customer account.",
    # Banking & Transaction confirmations
    "Dear Customer, INR {amount}.00 has been debited from your A/c ending {account} on {date}. Ref: {code}.",
    "Salary credit of INR {amount}.00 has been deposited into your account ending {account}. Available balance updated.",
    "Your monthly credit card e-statement for card ending {account} is ready. Total due INR {amount}. Due date {date}.",
    "UPI transaction of INR {amount}.00 to Grocery Store was successful on {date}. Ref: {code}.",
    "Your recurring auto-debit of INR {amount}.00 for utility bill payment has been processed.",
    # Reminders & Appointments
    "Reminder: Your scheduled dental consultation with Dr. Mehta is on {date} at 11:30 AM. Call clinic to reschedule.",
    "Your vehicle routine service is scheduled for {date} at Service Hub Center. Kindly bring your warranty book.",
    "Your flight AI-{code} from Delhi to Bengaluru departs on {date} at 14:20. Web check-in opens 48 hours prior.",
    "Your train ticket PNR {code} is confirmed. Coach B2, Seat 45. Departure scheduled {date} at 06:15 AM.",
    "Hotel booking confirmed at Grand Residency for check-in on {date}. Reservation ID: {code}.",
    # Service & Support
    "Your broadband connection has been renewed successfully. Next billing cycle commences on {date}.",
    "Support ticket #{code} has been resolved. If you require further assistance, reply directly to this thread.",
    "Password for your corporate portal was updated successfully on {date}. If not done by you, contact IT support.",
    "Your feedback matters: How was your service experience at Branch #{code}? Rate us from 1 to 5.",
    "Thank you for attending today's webinar on digital governance. Workshop slides have been emailed."
]

# Templates for synthetic scam / suspicious messages
SCAM_TEMPLATES = [
    # Authority Impersonation / Digital Arrest
    ("Digital Arrest Notice: CBI Cyber Cell has flagged your Aadhaar in money laundering. Connect via Skype immediately to avoid arrest: https://cbi-investigation.example/{code}", "Authority Impersonation", ["CBI", "Digital Arrest", "warrant", "immediate arrest"]),
    ("URGENT: Delhi High Court has issued a non-bailable arrest warrant against your phone number. Report online in 30 minutes at https://ecourt-warrant.example/{code}", "Authority Impersonation", ["Court warrant", "non-bailable", "urgent arrest"]),
    ("Customs Seizure Alert: A FedEx courier containing illegal narcotics and fake passports under your name was seized. Pay verification deposit at https://customs-nodal.example/{code}", "Customs Seizure", ["customs seized", "narcotics", "verification deposit"]),
    ("National Cyber Crime Bureau: Your device IP was traced in criminal operations. Call Investigating Inspector Verma immediately at +91 99999 {code} or face police raid.", "Police Impersonation", ["police raid", "cyber crime bureau", "criminal operation"]),
    ("Income Tax Notice: Discrepancy detected in FY24 assessment. Avoid asset freeze and criminal penalty by verifying ITR immediately: https://incometax-filing-alert.example/{code}", "Tax Authority Scam", ["asset freeze", "criminal penalty", "immediate action"]),
    # Banking OTP / KYC Fraud
    ("Dear SBI Customer, your YONO account will be blocked today due to pending PAN KYC. Update PAN card now at https://sbi-kyc-verify.example/{code}", "Banking KYC Scam", ["account blocked", "pending KYC", "update PAN", "urgent"]),
    ("HDFC Alert: Your bank debit card is temporarily suspended. Submit OTP and unfreeze account immediately at https://hdfc-unfreeze-secure.example/{code}", "Card Suspension", ["card suspended", "submit OTP", "unfreeze"]),
    ("ICICI Bank: Unrecognized login attempt from Russia. If this was not you, block card and share cancellation OTP: {code}", "Fake Security Alert", ["unrecognized login", "share OTP", "block card"]),
    ("Urgent: Your bank electricity power will be disconnected at 9:30 PM due to unpaid bill. Call nodal power officer at +91 98888 {code} immediately.", "Utility Disconnection", ["electricity disconnected", "call officer", "immediate payment"]),
    ("Bank Alert: Your reward points worth INR 9,850 are expiring tonight. Redeem cash directly to bank account at https://bank-reward-redeem.example/{code}", "Points Expiry Scam", ["reward points expiring", "redeem cash", "tonight only"]),
    # Investment & Crypto Fraud
    ("Earn INR 5,000 to 15,000 daily working part-time from home! Only 30 minutes daily reviewing travel videos. Join WhatsApp mentor: https://wa.example/{code}", "Task Job Scam", ["daily income", "part time", "review videos", "WhatsApp mentor"]),
    ("Exclusive Crypto Trading Opportunity: Guaranteed 300% return in 48 hours using automated arbitrage algorithm. Deposit minimum $100 to wallet: https://crypto-growth.example/{code}", "Crypto Fraud", ["guaranteed 300%", "automated arbitrage", "deposit wallet"]),
    ("Share Market Insider VIP Group: 100% accurate SEBI multi-bagger calls. Join private Telegram channel before link expires: https://t.example/{code}", "Stock Market Scam", ["100% accurate", "insider VIP", "multi-bagger", "expires"]),
    ("Congratulations! Your mobile number won 1st prize of INR 25,00,000 in KBC Lucky Draw 2026. Contact lottery manager Rana at +91 97777 {code}", "Lottery Fraud", ["KBC lucky draw", "won 25 lakhs", "lottery manager"]),
    ("Fast Personal Loan Approved: INR 5,00,000 pre-approved with zero interest for 6 months. Pay 2% processing fee to disburse: https://instant-loan-hub.example/{code}", "Loan Processing Fraud", ["pre-approved loan", "zero interest", "pay processing fee"])
]

def generate_synthetic_text_dataset(num_samples: int = 500) -> List[Dict[str, Any]]:
    """Generates ~500 varied, balanced synthetic SMS messages (legitimate vs suspicious)."""
    print(f"\n--- [Phase 6] Generating Synthetic Text Dataset (~{num_samples} samples) ---")
    text_dir = DATASET_ROOT / "text"
    legit_dir = text_dir / "legitimate"
    suspicious_dir = text_dir / "suspicious"
    meta_dir = text_dir / "metadata"
    splits_dir = DATASET_ROOT / "splits"

    for d in [legit_dir, suspicious_dir, meta_dir, splits_dir]:
        d.mkdir(parents=True, exist_ok=True)

    target_per_class = num_samples // 2
    samples = []
    sample_counter = 1

    dates = ["12-Oct", "15-Oct", "18-Oct", "22-Oct", "25-Oct", "28-Oct", "02-Nov", "05-Nov"]
    amounts = ["450", "1250", "3400", "5999", "12450", "28000", "85000"]
    accounts = ["1042", "3891", "4412", "7820", "9014", "5531", "6729"]

    # 1. Generate Legitimate Samples (~250)
    print(f"Generating {target_per_class} legitimate demonstration messages...")
    for i in range(target_per_class):
        sample_id = f"SYNTH_TXT_LEGIT_{sample_counter:04d}"
        tpl = LEGIT_TEMPLATES[i % len(LEGIT_TEMPLATES)]
        code = f"{random.randint(10000, 99999)}"
        amt = random.choice(amounts)
        acc = random.choice(accounts)
        dt = random.choice(dates)

        msg_text = tpl.format(code=code, amount=amt, account=acc, date=dt)
        # Small variations
        if i % 3 == 0:
            msg_text = msg_text.replace("Dear Customer, ", "Dear Valued Customer, ")
        elif i % 5 == 0:
            msg_text = msg_text + " Helpline: 1800-000-000."

        record = {
            "sample_id": sample_id,
            "message_text": msg_text,
            "label": "legitimate_demo",
            "category": "Customer Notification",
            "risk_indicators": [],
            "risk_level": "LOW",
            "risk_score": round(random.uniform(2.0, 15.0), 1),
            "explanation": "Standard benign notification containing no social engineering or urgency markers.",
            "generation_method": "programmatic_fictional_template_variation",
            "synthetic_data": True
        }
        samples.append(record)

        # Write sample text file
        with open(legit_dir / f"{sample_id}.txt", "w", encoding="utf-8") as f:
            f.write(msg_text)
        sample_counter += 1

    # 2. Generate Suspicious Samples (~250)
    print(f"Generating {target_per_class} suspicious demonstration messages...")
    for i in range(target_per_class):
        sample_id = f"SYNTH_TXT_SCAM_{sample_counter:04d}"
        tpl, cat, indicators = SCAM_TEMPLATES[i % len(SCAM_TEMPLATES)]
        code = f"{random.randint(10000, 99999)}"

        msg_text = tpl.format(code=code)
        # Variation additions
        if i % 4 == 0:
            msg_text = "FINAL WARNING: " + msg_text
        elif i % 6 == 0:
            msg_text = msg_text + " Do not ignore this statutory notice."

        record = {
            "sample_id": sample_id,
            "message_text": msg_text,
            "label": "suspicious_demo",
            "category": cat,
            "risk_indicators": indicators,
            "risk_level": "HIGH" if "warrant" in msg_text or "CBI" in msg_text or "OTP" in msg_text else "MEDIUM",
            "risk_score": round(random.uniform(65.0, 96.0), 1),
            "explanation": f"Contains social engineering patterns matching {cat} with artificial urgency.",
            "generation_method": "programmatic_fictional_threat_pattern_generation",
            "synthetic_data": True
        }
        samples.append(record)

        with open(suspicious_dir / f"{sample_id}.txt", "w", encoding="utf-8") as f:
            f.write(msg_text)
        sample_counter += 1

    # Shuffle for train/val/test splits
    random.shuffle(samples)

    # Save complete text manifest
    json_path = meta_dir / "text_manifest.json"
    csv_path = meta_dir / "text_manifest.csv"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(samples, f, indent=2)

    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(samples[0].keys()))
        writer.writeheader()
        writer.writerows(samples)

    # 3. Create reproducible train / val / test splits (70% / 15% / 15%)
    n = len(samples)
    train_n = int(0.70 * n)
    val_n = int(0.15 * n)

    train_split = samples[:train_n]
    val_split = samples[train_n:train_n + val_n]
    test_split = samples[train_n + val_n:]

    with open(splits_dir / "text_train.json", "w", encoding="utf-8") as f:
        json.dump(train_split, f, indent=2)
    with open(splits_dir / "text_val.json", "w", encoding="utf-8") as f:
        json.dump(val_split, f, indent=2)
    with open(splits_dir / "text_test.json", "w", encoding="utf-8") as f:
        json.dump(test_split, f, indent=2)

    print(f"Text dataset generated: {len(samples)} total (Train: {len(train_split)}, Val: {len(val_split)}, Test: {len(test_split)})")
    return samples

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

def main():
    print("=================================================================")
    print("TrustGuard AI — Synthetic Demonstration Dataset Pipeline")
    print("Safe, Programmatic, Reproducible Mock Forensic Assets")
    print("=================================================================")

    # 1. Audio
    audio_records = generate_synthetic_audio_dataset()

    # 2. Video
    video_records = generate_synthetic_video_dataset()

    # 3. Multimodal
    multi_records = generate_synthetic_multimodal_dataset(audio_records, video_records)

    # 4. Text (500 samples)
    text_records = generate_synthetic_text_dataset(num_samples=500)

    # 5. Global Synthetic Manifest
    manifests_dir = DATASET_ROOT / "manifests"
    manifests_dir.mkdir(parents=True, exist_ok=True)
    global_manifest = {
        "dataset_name": "TrustGuard-AI-Synthetic-Demo-Benchmark",
        "version": "1.0.0",
        "created_timestamp": "2026-10-04T20:45:00Z",
        "license": "CC0-1.0-Universal / Academic-Demo-Only",
        "description": "Synthetic demonstration dataset created programmatically for academic prototyping without real-world PII or copyright restrictions.",
        "counts": {
            "audio_samples": len(audio_records),
            "video_samples": len(video_records),
            "multimodal_pairs": len(multi_records),
            "text_samples": len(text_records)
        },
        "modalities": {
            "audio": {
                "clean_count": sum(1 for r in audio_records if r["label"] == "synthetic_clean_demo"),
                "transformed_count": sum(1 for r in audio_records if r["label"] == "synthetic_transformed_demo"),
            },
            "video": {
                "original_count": sum(1 for r in video_records if r["label"] == "synthetic_original_demo"),
                "transformed_count": sum(1 for r in video_records if r["label"] == "synthetic_transformed_demo"),
            },
            "multimodal": {
                "pair_count": len(multi_records)
            },
            "text": {
                "legitimate_count": sum(1 for r in text_records if r["label"] == "legitimate_demo"),
                "suspicious_count": sum(1 for r in text_records if r["label"] == "suspicious_demo"),
            }
        },
        "synthetic_data": True,
        "warning": "ACADEMIC DEMO PURPOSE ONLY. NEVER USE AS REAL EVIDENCE OR CLAIM ACCURACY OVER REAL-WORLD THREATS."
    }

    with open(manifests_dir / "synthetic_dataset_manifest.json", "w", encoding="utf-8") as f:
        json.dump(global_manifest, f, indent=2)

    print("\n[SUCCESS] All synthetic datasets generated successfully.")
    print(f"Summary manifest saved to: {manifests_dir / 'synthetic_dataset_manifest.json'}")

if __name__ == "__main__":
    main()
