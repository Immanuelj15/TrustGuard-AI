import os
import logging
from typing import Dict, Any, Optional
from .config import HFConfig

logger = logging.getLogger(__name__)

class HuggingFaceAudioTranscriber:
    """
    Modular Hugging Face transformer wrapper for Speech-to-Text (ASR) transcription.
    Enables automatic extraction of spoken content from forensic audio evidence for downstream scam analysis.
    """
    _instance: Optional["HuggingFaceAudioTranscriber"] = None
    _pipeline = None
    _load_error: Optional[str] = None

    @classmethod
    def get_instance(cls) -> "HuggingFaceAudioTranscriber":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.model_id = HFConfig.ASR_MODEL_ID
        self.device = HFConfig.DEVICE

    def _load_pipeline(self):
        if self._pipeline is not None:
            return self._pipeline
        if self._load_error is not None:
            return None

        # Check system resource guards
        resources = HFConfig.check_system_resources()
        if not resources["has_sufficient_disk"]:
            self._load_error = f"Insufficient disk space ({resources['free_disk_gb']} GB < {HFConfig.MIN_DISK_FREE_GB} GB)"
            logger.warning(f"HF Audio Transcriber load aborted: {self._load_error}")
            return None

        try:
            from transformers import pipeline
            device_idx = 0 if resources["device"] == "cuda" else -1
            logger.info(f"Loading Hugging Face ASR pipeline '{self.model_id}' on {resources['device']}...")
            try:
                # First attempt: load directly from local cache to avoid network timeouts
                self._pipeline = pipeline(
                    "automatic-speech-recognition",
                    model=self.model_id,
                    device=device_idx,
                    model_kwargs={"local_files_only": True}
                )
            except Exception:
                # Second attempt: allow remote download if not cached
                self._pipeline = pipeline(
                    "automatic-speech-recognition",
                    model=self.model_id,
                    device=device_idx
                )
            logger.info(f"Successfully loaded Hugging Face ASR model: {self.model_id}")
            return self._pipeline
        except Exception as e:
            self._load_error = str(e)
            logger.warning(f"Failed to load Hugging Face ASR model '{self.model_id}': {e}")
            return None

    def is_available(self) -> bool:
        if not HFConfig.ENABLED:
            return False
        pipe = self._load_pipeline()
        return pipe is not None

    def get_status(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_id,
            "enabled": HFConfig.ENABLED,
            "loaded": self._pipeline is not None,
            "load_error": self._load_error,
            "device": self.device
        }

    def transcribe(self, audio_file_path: str) -> Optional[Dict[str, Any]]:
        """
        Runs speech-to-text inference on the target audio file.
        Returns structured transcription results or None if unconfigured/failed.
        """
        if not HFConfig.ENABLED:
            return None

        if not os.path.exists(audio_file_path):
            return {
                "error": f"Audio file not found: {audio_file_path}",
                "is_hf_inference": False
            }

        file_size = os.path.getsize(audio_file_path)
        if file_size > HFConfig.MAX_AUDIO_BYTES:
            logger.warning(f"Audio file size ({file_size} bytes) exceeds limit ({HFConfig.MAX_AUDIO_BYTES} bytes)")
            return None

        pipe = self._load_pipeline()
        if pipe is None:
            return None

        try:
            # If WAV file, load in-memory via scipy to eliminate external ffmpeg dependency
            audio_input = audio_file_path
            if audio_file_path.lower().endswith(".wav"):
                try:
                    import numpy as np
                    from scipy.io import wavfile
                    sr, data = wavfile.read(audio_file_path)
                    if data.ndim > 1:
                        data = data.mean(axis=1)
                    if data.dtype != np.float32:
                        max_val = np.iinfo(data.dtype).max if np.issubdtype(data.dtype, np.integer) else 1.0
                        data = (data / max_val).astype(np.float32)
                    audio_input = {"sampling_rate": sr, "raw": data}
                except Exception as read_err:
                    logger.debug(f"Direct wavfile reading failed, attempting path fallback: {read_err}")
                    audio_input = audio_file_path

            result = pipe(audio_input)
            transcript_text = result.get("text", "").strip() if isinstance(result, dict) else str(result).strip()

            return {
                "model_name": f"HuggingFace-{self.model_id}",
                "is_hf_inference": True,
                "transcription": transcript_text,
                "character_count": len(transcript_text),
                "limitations": [
                    "Speech-to-text models can hallucinate on silent, music-heavy, or degraded telephone audio.",
                    "Accents and multi-lingual code-switching (e.g. Hinglish) may yield transcription inaccuracies.",
                    "Transcript content requires investigator review before being cited in official forensic reports."
                ]
            }
        except Exception as e:
            logger.error(f"HF Audio Transcription error: {e}")
            return None
