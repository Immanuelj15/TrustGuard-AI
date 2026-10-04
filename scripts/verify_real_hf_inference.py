import os
import sys
import time
import shutil
import psutil
from pathlib import Path

# Add backend directory to sys.path so app modules import cleanly
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.ai.hf.config import HFConfig
from app.ai.hf.text_classifier import HuggingFaceTextClassifier
from app.ai.hf.audio_transcriber import HuggingFaceAudioTranscriber
from app.ai.hf.model_manager import HFModelManager

def run_real_hf_verification():
    print("=" * 70)
    print("TrustGuard AI — Real Hugging Face Live Inference Verification")
    print("=" * 70)

    # 1. Inspect System Hardware & Memory Headroom
    total, used, free = shutil.disk_usage(".")
    mem = psutil.virtual_memory()
    cuda_avail = False
    try:
        import torch
        cuda_avail = torch.cuda.is_available()
    except Exception:
        pass

    print("\n[1] HARDWARE & RESOURCE AUDIT:")
    print(f"  • Disk Space: Total={total/(1024**3):.1f} GB | Free={free/(1024**3):.1f} GB (Required >= {HFConfig.MIN_DISK_FREE_GB} GB)")
    print(f"  • RAM: Total={mem.total/(1024**3):.1f} GB | Available={mem.available/(1024**3):.1f} GB | Used%={mem.percent}%")
    print(f"  • Compute Device: {'CUDA GPU' if cuda_avail else 'CPU (Intel/AMD Architecture)'}")

    # 2. Enable Hugging Face in configuration
    HFConfig.ENABLED = True
    print("\n[2] CONFIGURATION AUDIT:")
    print(f"  • HF_ENABLED: {HFConfig.ENABLED}")
    print(f"  • Text Model ID: {HFConfig.TEXT_MODEL_ID}")
    print(f"  • Audio ASR Model ID: {HFConfig.ASR_MODEL_ID}")
    print(f"  • Video Model ID: {HFConfig.VIDEO_MODEL_ID} (Optional Enabled: {HFConfig.ENABLE_VIDEO_HF})")
    print(f"  • Cache Root: {os.path.expanduser('~/.cache/huggingface/hub')}")

    # 3. Real Text Inference - Test Case A: Harmless Synthetic Message
    print("\n" + "-" * 70)
    print("[3] TEST SUITE 1: Real Hugging Face Text Classifier Execution")
    print("-" * 70)
    
    text_classifier = HuggingFaceTextClassifier.get_instance()
    
    benign_text = (
        "[SYNTHETIC-DEMO-BENIGN] Hi Team, please remember to submit your weekly timesheets "
        "by Friday 5 PM before our quarterly sprint planning session."
    )
    print(f"\n[Test 1A] Evaluating Benign Synthetic Message:")
    print(f"  Input: \"{benign_text}\"")
    
    t0 = time.time()
    res_benign = text_classifier.predict(benign_text)
    latency_benign_ms = round((time.time() - t0) * 1000, 2)
    
    print(f"  Status: {'SUCCESS' if res_benign and 'predicted_label' in res_benign else 'FAILED'}")
    print(f"  Model ID: {text_classifier.model_id}")
    print(f"  Inference Latency: {latency_benign_ms} ms")
    if res_benign:
        print(f"  Predicted Label: {res_benign.get('predicted_label')} (Raw Label: {res_benign.get('raw_label')})")
        print(f"  Confidence Score: {res_benign.get('confidence')}")
        print(f"  Calibrated Risk Score: {res_benign.get('risk_score')} / 100")
        print(f"  Model Attribution: {res_benign.get('model_name')}")

    # Test Case B: Suspicious Synthetic Message
    suspicious_text = (
        "[SYNTHETIC-DEMO-SUSPICIOUS] URGENT: Mumbai Police Cyber Cell. Digital Arrest warrant #CR-8821 issued. "
        "Transfer Rs 45,000 immediately to escrow account or police will arrive in 30 mins."
    )
    print(f"\n[Test 1B] Evaluating Suspicious Synthetic Message:")
    print(f"  Input: \"{suspicious_text}\"")
    
    t0 = time.time()
    res_suspicious = text_classifier.predict(suspicious_text)
    latency_suspicious_ms = round((time.time() - t0) * 1000, 2)
    
    print(f"  Status: {'SUCCESS' if res_suspicious and 'predicted_label' in res_suspicious else 'FAILED'}")
    print(f"  Model ID: {text_classifier.model_id}")
    print(f"  Inference Latency: {latency_suspicious_ms} ms")
    if res_suspicious:
        print(f"  Predicted Label: {res_suspicious.get('predicted_label')} (Raw Label: {res_suspicious.get('raw_label')})")
        print(f"  Confidence Score: {res_suspicious.get('confidence')}")
        print(f"  Calibrated Risk Score: {res_suspicious.get('risk_score')} / 100")
        print(f"  Model Attribution: {res_suspicious.get('model_name')}")

    # 4. Real Audio Speech-to-Text - Test Case C: Synthetic Audio Sample
    print("\n" + "-" * 70)
    print("[4] TEST SUITE 2: Real Hugging Face Whisper ASR Execution")
    print("-" * 70)

    audio_file_rel = "datasets/synthetic/audio/bona_fide/SYNTH_AUD_CLEAN_001.wav"
    audio_path = str(PROJECT_ROOT / audio_file_rel)
    
    print(f"\n[Test 2] Evaluating Audio File: {audio_file_rel}")
    if not os.path.exists(audio_path):
        print(f"  ERROR: Audio sample not found at: {audio_path}")
        return

    file_size_kb = round(os.path.getsize(audio_path) / 1024, 2)
    print(f"  Audio File Size: {file_size_kb} KB")
    print(f"  Synthetic Provenance: Programmatic local TTS synthesis (pyttsx3)")
    print(f"  Ground Truth Text: 'Good morning. This is an automated update regarding your account security settings.'")

    transcriber = HuggingFaceAudioTranscriber.get_instance()
    
    print(f"  Invoking Whisper ASR pipeline ('{transcriber.model_id}')... (downloading weights if first run)")
    t0 = time.time()
    asr_res = transcriber.transcribe(audio_path)
    asr_latency_ms = round((time.time() - t0) * 1000, 2)

    print(f"  Status: {'SUCCESS' if asr_res and 'transcription' in asr_res else 'FAILED'}")
    print(f"  Model ID: {transcriber.model_id}")
    print(f"  Inference Latency: {asr_latency_ms} ms")
    if asr_res:
        transcript = asr_res.get('transcription', '')
        print(f"  Real Whisper Transcription Output:")
        print(f"    \"{transcript}\"")
        print(f"  Character Count: {asr_res.get('character_count')}")
        print(f"  Model Attribution: {asr_res.get('model_name')}")

    # 5. Check Disk Cache Status
    print("\n" + "-" * 70)
    print("[5] HUGGING FACE LOCAL CACHE INSPECTION")
    print("-" * 70)
    cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
    if os.path.exists(cache_dir):
        cached_dirs = [d for d in os.listdir(cache_dir) if d.startswith("models--")]
        print(f"  Cache Directory: {cache_dir}")
        print(f"  Confirmed Local Hugging Face Models on Disk ({len(cached_dirs)}):")
        for m in cached_dirs:
            print(f"    [OK] {m}")
    else:
        print(f"  Cache Directory {cache_dir} not found.")

    print("\n" + "=" * 70)
    print("Real Inference Verification Complete.")
    print("=" * 70)

if __name__ == "__main__":
    run_real_hf_verification()
