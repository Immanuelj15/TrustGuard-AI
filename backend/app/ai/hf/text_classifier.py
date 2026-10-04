import logging
from typing import Dict, Any, Optional
from .config import HFConfig

logger = logging.getLogger(__name__)

class HuggingFaceTextClassifier:
    """
    Modular Hugging Face transformer wrapper for scam/spam text classification.
    Implements lazy-loading, input validation, and transparent forensic reporting.
    """
    _instance: Optional["HuggingFaceTextClassifier"] = None
    _pipeline = None
    _load_error: Optional[str] = None
    _is_loading: bool = False

    @classmethod
    def get_instance(cls) -> "HuggingFaceTextClassifier":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.model_id = HFConfig.TEXT_MODEL_ID
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
            logger.warning(f"HF Text Classifier load aborted: {self._load_error}")
            return None

        try:
            from transformers import pipeline
            device_idx = 0 if resources["device"] == "cuda" else -1
            logger.info(f"Loading Hugging Face text classification pipeline '{self.model_id}' on {resources['device']}...")
            try:
                # First attempt: load directly from local cache to avoid network timeouts
                self._pipeline = pipeline(
                    "text-classification",
                    model=self.model_id,
                    device=device_idx,
                    truncation=True,
                    max_length=512,
                    model_kwargs={"local_files_only": True}
                )
            except Exception:
                # Second attempt: allow remote download if not cached
                self._pipeline = pipeline(
                    "text-classification",
                    model=self.model_id,
                    device=device_idx,
                    truncation=True,
                    max_length=512
                )
            logger.info(f"Successfully loaded Hugging Face model: {self.model_id}")
            return self._pipeline
        except Exception as e:
            self._load_error = str(e)
            logger.warning(f"Failed to load Hugging Face text model '{self.model_id}': {e}")
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

    def predict(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Runs transformer inference on input text string.
        Returns None if HF is disabled or fails, allowing the caller to use fallback engines.
        """
        if not HFConfig.ENABLED:
            return None

        if not text or not text.strip():
            return {
                "error": "Input text is empty",
                "is_hf_inference": False
            }

        pipe = self._load_pipeline()
        if pipe is None:
            return None

        # Sanitize and truncate input
        clean_text = text.strip()[:HFConfig.MAX_TEXT_CHARS]

        try:
            results = pipe(clean_text)
            if not results:
                return None

            top = results[0]
            raw_label = str(top.get("label", "")).upper()
            raw_score = float(top.get("score", 0.0))

            # Normalize label (typical models use LABEL_1/SPAM for suspicious, LABEL_0/HAM for legitimate)
            is_suspicious = raw_label in ("LABEL_1", "SPAM", "SUSPICIOUS", "PHISHING")
            normalized_label = "suspicious" if is_suspicious else "legitimate"
            calibrated_risk_score = round(raw_score * 100.0, 1) if is_suspicious else round((1.0 - raw_score) * 100.0, 1)

            return {
                "model_name": f"HuggingFace-{self.model_id}",
                "model_version": "hf-transformer-v1",
                "is_hf_inference": True,
                "predicted_label": normalized_label,
                "confidence": round(raw_score, 4),
                "risk_score": calibrated_risk_score,
                "raw_label": raw_label,
                "raw_score": round(raw_score, 4),
                "limitations": [
                    "Transformer classification reflects statistical training correlations on SMS/phishing corpora.",
                    "Does not prove legal culpability or fraudulent intent.",
                    "Should be cross-referenced with rule-based explainable indicator patterns and investigator context."
                ]
            }
        except Exception as e:
            logger.error(f"HF Text Inference error: {e}")
            return None
