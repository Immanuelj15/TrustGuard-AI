import os
import json
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import Evidence, Case, InvestigatorNote, User, EvidenceType
from app.core.storage import storage_client
from app.services.audit_service import log_audit_event
from app.services.ml_services import (
    ScamTextAnalysisService,
    AudioAnalysisService,
    VideoAnalysisService
)

# Robust project root discovery:
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
SYNTHETIC_ROOT = PROJECT_ROOT / "datasets" / "synthetic"
if not SYNTHETIC_ROOT.exists():
    # Fallback to local datasets directory if present
    SYNTHETIC_ROOT = Path("datasets/synthetic").resolve()

class SyntheticDataService:
    @staticmethod
    def get_manifest() -> Dict[str, Any]:
        manifest_path = SYNTHETIC_ROOT / "manifests" / "synthetic_dataset_manifest.json"
        if not manifest_path.exists():
            return {
                "dataset_name": "TrustGuard-AI-Synthetic-Demo-Benchmark",
                "status": "not_generated",
                "counts": {"audio_samples": 0, "video_samples": 0, "multimodal_pairs": 0, "text_samples": 0}
            }
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def get_samples(modality: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        samples = []

        # 1. Text samples
        if modality is None or modality == "text":
            text_manifest = SYNTHETIC_ROOT / "text" / "metadata" / "text_manifest.json"
            if text_manifest.exists():
                with open(text_manifest, "r", encoding="utf-8") as f:
                    for item in json.load(f)[:limit]:
                        samples.append({
                            "sample_id": item["sample_id"],
                            "modality": "text",
                            "label": item["label"],
                            "title": f"[{item['category']}] {item['sample_id']}",
                            "summary": item["message_text"][:120] + "...",
                            "category": item["category"],
                            "risk_score": item.get("risk_score", 0.0),
                            "risk_level": item.get("risk_level", "LOW"),
                            "synthetic_data": True,
                            "filename": f"{item['sample_id']}.txt",
                            "file_path": str(SYNTHETIC_ROOT / "text" / ("suspicious" if "SCAM" in item["sample_id"] else "legitimate") / f"{item['sample_id']}.txt").replace("\\", "/")
                        })

        # 2. Audio samples
        if modality is None or modality == "audio":
            audio_manifest = SYNTHETIC_ROOT / "audio" / "metadata" / "audio_manifest.json"
            if audio_manifest.exists():
                with open(audio_manifest, "r", encoding="utf-8") as f:
                    for item in json.load(f):
                        samples.append({
                            "sample_id": item["sample_id"],
                            "modality": "audio",
                            "label": item["label"],
                            "title": f"{item['sample_id']} ({item['transformation_applied']})",
                            "summary": item["source_text"],
                            "category": "Voice Telemetry Sample",
                            "duration_seconds": item["duration_seconds"],
                            "sample_rate": item["sample_rate"],
                            "transformation": item["transformation_applied"],
                            "synthetic_data": True,
                            "filename": item["filename"],
                            "file_path": item["file_path"]
                        })

        # 3. Video samples
        if modality is None or modality == "video":
            video_manifest = SYNTHETIC_ROOT / "video" / "metadata" / "video_manifest.json"
            if video_manifest.exists():
                with open(video_manifest, "r", encoding="utf-8") as f:
                    for item in json.load(f):
                        samples.append({
                            "sample_id": item["sample_id"],
                            "modality": "video",
                            "label": item["label"],
                            "title": item["scenario_title"],
                            "summary": f"{item['resolution']} @ {item['fps']} FPS, {item['frame_count']} frames",
                            "category": "Video Telemetry Sample",
                            "duration_seconds": item["duration_seconds"],
                            "resolution": item["resolution"],
                            "transformation": item["transformation_applied"],
                            "synthetic_data": True,
                            "filename": item["filename"],
                            "file_path": item["video_path"]
                        })

        # 4. Multimodal samples
        if modality is None or modality == "multimodal":
            multi_manifest = SYNTHETIC_ROOT / "multimodal" / "metadata" / "multimodal_manifest.json"
            if multi_manifest.exists():
                with open(multi_manifest, "r", encoding="utf-8") as f:
                    for item in json.load(f):
                        samples.append({
                            "sample_id": item["pair_id"],
                            "modality": "multimodal",
                            "label": item["label"],
                            "title": f"Pair {item['pair_id']} ({item['synchronization_status']})",
                            "summary": f"Audio: {item['audio_sample_id']} | Video: {item['video_sample_id']}",
                            "category": "Cross-Modality Pair",
                            "audio_path": item["audio_path"],
                            "video_path": item["video_path"],
                            "duration_delta": item["duration_delta"],
                            "synchronization_status": item["synchronization_status"],
                            "synthetic_data": True
                        })

        return samples

    @staticmethod
    def load_sample_to_case(db: Session, case_id: str, sample_id: str, user: User) -> Evidence:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

        # Find sample
        all_samples = SyntheticDataService.get_samples(limit=1000)
        target = next((s for s in all_samples if s["sample_id"] == sample_id), None)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Synthetic sample '{sample_id}' not found")

        file_path_str = target.get("file_path")
        if not file_path_str:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Multimodal pairs must be loaded individually via audio/video sample IDs")

        src_path = Path(file_path_str)
        if not src_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Source synthetic asset file does not exist on disk: {src_path}")

        with open(src_path, "rb") as f:
            data = f.read()

        file_size = len(data)
        sha256 = hashlib.sha256(data).hexdigest()
        modality = target["modality"]
        orig_filename = f"[SYNTHETIC-DEMO]_{src_path.name}"

        # Determine mime type
        mime = "text/plain"
        if modality == "audio":
            mime = "audio/wav"
        elif modality == "video":
            mime = "video/mp4"

        # Store into storage
        object_key = f"cases/{case.id}/evidence/{sha256}_{src_path.name}"
        stored_key = storage_client.save_bytes(object_key, data, content_type=mime)

        evidence = Evidence(
            case_id=case.id,
            original_filename=orig_filename,
            stored_object_key=stored_key,
            mime_type=mime,
            file_size=file_size,
            sha256_hash=sha256,
            evidence_type=modality,
            uploaded_by=user.id,
            processing_status="ready"
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)

        # Attach immutable audit note explaining synthetic provenance
        note_text = (
            f"[DEMO PROVENANCE NOTICE] Synthetic demonstration asset '{sample_id}' attached for academic inspection. "
            f"Cryptographic SHA-256 Digest: {sha256}. "
            f"Provenance: Programmatic generation (synthetic_data=True). "
            f"THIS IS NOT REAL VICTIM EVIDENCE."
        )
        note = InvestigatorNote(
            case_id=case.id,
            evidence_id=evidence.id,
            user_id=user.id,
            note=note_text
        )
        db.add(note)
        db.commit()

        log_audit_event(
            db,
            action="DEMO_EVIDENCE_ATTACHED",
            user_id=user.id,
            case_id=case.id,
            evidence_id=evidence.id,
            metadata={
                "sample_id": sample_id,
                "modality": modality,
                "sha256": sha256,
                "synthetic_data": True
            }
        )

        return evidence

    @staticmethod
    def direct_analyze_sample(sample_id: str) -> Dict[str, Any]:
        all_samples = SyntheticDataService.get_samples(limit=1000)
        target = next((s for s in all_samples if s["sample_id"] == sample_id), None)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Synthetic sample '{sample_id}' not found")

        modality = target["modality"]
        fpath = target.get("file_path")

        text_service = ScamTextAnalysisService()
        audio_service = AudioAnalysisService()
        video_service = VideoAnalysisService()

        if modality == "text":
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            raw_res = text_service.analyze(content)
        elif modality == "audio":
            raw_res = audio_service.analyze(fpath, is_demo_mode=True)
        elif modality == "video":
            raw_res = video_service.analyze(fpath, is_demo_mode=True)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Direct analysis unsupported for {modality}")

        # Inject visible demo banners and explicit transparency safeguards
        raw_res["is_synthetic_demo"] = True
        raw_res["demo_banner"] = "DEMO RESULT — GENERATED SYNTHETIC DATA"
        raw_res["sample_id"] = sample_id
        raw_res["sample_metadata"] = target
        raw_res["provenance_notice"] = (
            "This analysis was executed on synthetic demonstration data. "
            "Results illustrate algorithmic cue telemetry for academic presentation and must not be used in legal conclusions."
        )

        return raw_res
