from typing import Dict, Any
from .config import HFConfig
from .text_classifier import HuggingFaceTextClassifier
from .audio_transcriber import HuggingFaceAudioTranscriber

class HFModelManager:
    """
    Central registry and diagnostic service for Hugging Face models in TrustGuard AI.
    """
    @classmethod
    def get_full_status(cls) -> Dict[str, Any]:
        resources = HFConfig.check_system_resources()
        text_status = HuggingFaceTextClassifier.get_instance().get_status()
        asr_status = HuggingFaceAudioTranscriber.get_instance().get_status()

        return {
            "global_enabled": HFConfig.ENABLED,
            "device": resources["device"],
            "resources": resources,
            "models": {
                "text_classification": text_status,
                "audio_transcription": asr_status,
                "video_deepfake": {
                    "model_id": HFConfig.VIDEO_MODEL_ID,
                    "enabled": HFConfig.ENABLE_VIDEO_HF,
                    "loaded": False,
                    "note": "Optional on-demand vision model. Disabled by default on CPU environments to preserve system responsiveness."
                }
            }
        }
