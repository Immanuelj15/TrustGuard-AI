import os
import shutil
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class HFConfig:
    """
    Configuration and resource guard for Hugging Face model integrations in TrustGuard AI.
    Settings are dynamically read from environment variables.
    """
    ENABLED: bool = os.getenv("HF_ENABLED", "false").lower() in ("true", "1", "yes")
    
    # Text Scam / Suspicious Classification Model
    TEXT_MODEL_ID: str = os.getenv(
        "HF_TEXT_MODEL_ID",
        "mrm8488/bert-tiny-finetuned-sms-spam-detection"
    )
    
    # Audio Speech-to-Text Transcription Model
    ASR_MODEL_ID: str = os.getenv(
        "HF_ASR_MODEL_ID",
        "openai/whisper-tiny"
    )
    
    # Optional Deepfake Video Frame Inspection Model
    VIDEO_MODEL_ID: str = os.getenv(
        "HF_VIDEO_MODEL_ID",
        "dima806/deepfake_vs_real_image_detection"
    )
    ENABLE_VIDEO_HF: bool = os.getenv("ENABLE_HF_VIDEO_MODEL", "false").lower() in ("true", "1", "yes")

    # Hardware & Performance Guardrails
    DEVICE: str = os.getenv("HF_DEVICE", "cpu")
    TIMEOUT_SECONDS: int = int(os.getenv("HF_TIMEOUT_SECONDS", "15"))
    MIN_DISK_FREE_GB: float = float(os.getenv("HF_MIN_DISK_FREE_GB", "2.0"))
    MAX_TEXT_CHARS: int = int(os.getenv("HF_MAX_TEXT_CHARS", "2000"))
    MAX_AUDIO_BYTES: int = int(os.getenv("HF_MAX_AUDIO_BYTES", str(25 * 1024 * 1024))) # 25 MB cap

    @classmethod
    def check_system_resources(cls) -> Dict[str, Any]:
        """
        Validates whether system disk space and compute capabilities meet minimum thresholds.
        Prevents uncontrolled model downloads that could exhaust system resources.
        """
        try:
            total, used, free = shutil.disk_usage(".")
            free_gb = round(free / (1024 ** 3), 2)
            has_disk = free_gb >= cls.MIN_DISK_FREE_GB
        except Exception as e:
            logger.warning(f"Could not check disk usage: {e}")
            free_gb = -1.0
            has_disk = True

        cuda_available = False
        try:
            import torch
            cuda_available = torch.cuda.is_available()
        except ImportError:
            pass

        return {
            "has_sufficient_disk": has_disk,
            "free_disk_gb": free_gb,
            "min_required_disk_gb": cls.MIN_DISK_FREE_GB,
            "cuda_available": cuda_available,
            "device": "cuda" if (cuda_available and cls.DEVICE != "cpu") else "cpu"
        }
