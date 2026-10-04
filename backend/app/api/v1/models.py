from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Dict, Any
from app.services.auth_service import get_current_user
from app.models import User
from app.ai.hf.model_manager import HFModelManager
from app.ai.hf.text_classifier import HuggingFaceTextClassifier
from app.ai.hf.audio_transcriber import HuggingFaceAudioTranscriber
import tempfile
import os

router = APIRouter()

@router.get("/registry", response_model=Dict[str, Any])
def get_model_registry_status(
    current_user: User = Depends(get_current_user)
):
    """
    Returns transparency status of all integrated and optional AI models,
    including Hugging Face transformer models, hardware availability, and resource guards.
    """
    return HFModelManager.get_full_status()

@router.post("/hf/predict-text", response_model=Dict[str, Any])
def predict_hf_text(
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user)
):
    """
    Directly evaluates a text string using the Hugging Face transformer pipeline, if enabled.
    """
    text = payload.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="Missing 'text' in request body")

    result = HuggingFaceTextClassifier.get_instance().predict(text)
    if result is None:
        return {
            "status": "hf_disabled_or_unavailable",
            "message": "Hugging Face model inference is currently disabled or weights could not be loaded.",
            "fallback_available": True
        }
    return result
