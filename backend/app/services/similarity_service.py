from typing import Dict, List, Any
from sqlalchemy.orm import Session
from app.models import Evidence, AnalysisJob, Case
from app.core.storage import storage_client

def calculate_evidence_similarity(db: Session, case_id: str) -> Dict[str, Any]:
    """
    Computes pairwise lexical and semantic similarity between text artifacts
    and transcribed audio within a case using local TF-IDF and cosine distance.
    Also detects exact byte-for-byte duplicates via SHA-256 hash collision.
    """
    evidence_list = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    if not evidence_list or len(evidence_list) < 2:
        return {
            "case_id": case_id,
            "comparisons": [],
            "exact_duplicates": [],
            "message": "At least 2 evidence artifacts are required to compute similarity."
        }

    # 1. Exact Binary Duplicate Detection via SHA-256
    hash_groups: Dict[str, List[Evidence]] = {}
    for ev in evidence_list:
        h = ev.sha256_hash.lower()
        if h not in hash_groups:
            hash_groups[h] = []
        hash_groups[h].append(ev)

    exact_duplicates = []
    for h, group in hash_groups.items():
        if len(group) >= 2:
            exact_duplicates.append({
                "sha256_hash": h,
                "evidence_count": len(group),
                "items": [
                    {"id": e.id, "filename": e.original_filename, "size_bytes": e.file_size}
                    for e in group
                ]
            })

    # 2. Text Content Extraction for Similarity
    # Extract text from text files or from completed Whisper audio transcripts
    text_corpus: List[Dict[str, Any]] = []

    for ev in evidence_list:
        content = ""
        source_label = "raw_text"
        if ev.evidence_type == "text":
            raw_bytes = storage_client.get_bytes(ev.stored_object_key)
            if raw_bytes:
                content = raw_bytes.decode("utf-8", errors="replace").strip()
        elif ev.evidence_type == "audio":
            # Check if there is an audio job with a completed transcript
            job = db.query(AnalysisJob).filter(
                AnalysisJob.evidence_id == ev.id,
                AnalysisJob.analysis_type == "audio",
                AnalysisJob.status == "completed"
            ).first()
            if job and job.result and job.result.findings_json:
                content = job.result.findings_json.get("transcript", "").strip()
                source_label = "whisper_transcript"

        if content and len(content) >= 10:
            text_corpus.append({
                "evidence_id": ev.id,
                "filename": ev.original_filename,
                "text": content,
                "source": source_label
            })

    comparisons: List[Dict[str, Any]] = []
    if len(text_corpus) >= 2:
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity

            texts = [item["text"] for item in text_corpus]
            vectorizer = TfidfVectorizer(stop_words="english", max_features=1000)
            tfidf_matrix = vectorizer.fit_transform(texts)
            sim_matrix = cosine_similarity(tfidf_matrix)

            for i in range(len(text_corpus)):
                for j in range(i + 1, len(text_corpus)):
                    score = float(sim_matrix[i, j])
                    pct = round(score * 100, 1)

                    if pct >= 90:
                        level = "Very Similar"
                    elif pct >= 75:
                        level = "Related"
                    elif pct >= 50:
                        level = "Possibly Related"
                    else:
                        level = "Low Similarity"

                    comparisons.append({
                        "source_evidence_id": text_corpus[i]["evidence_id"],
                        "source_filename": text_corpus[i]["filename"],
                        "source_type": text_corpus[i]["source"],
                        "target_evidence_id": text_corpus[j]["evidence_id"],
                        "target_filename": text_corpus[j]["filename"],
                        "target_type": text_corpus[j]["source"],
                        "similarity_score": pct,
                        "similarity_level": level,
                        "shared_words_sample": list(set(texts[i].lower().split()) & set(texts[j].lower().split()))[:6]
                    })
        except Exception as e:
            # Fallback simple Jaccard similarity if sklearn encounters any error
            for i in range(len(text_corpus)):
                for j in range(i + 1, len(text_corpus)):
                    w1 = set(text_corpus[i]["text"].lower().split())
                    w2 = set(text_corpus[j]["text"].lower().split())
                    union = len(w1 | w2)
                    jaccard = len(w1 & w2) / union if union > 0 else 0.0
                    pct = round(jaccard * 100, 1)
                    comparisons.append({
                        "source_evidence_id": text_corpus[i]["evidence_id"],
                        "source_filename": text_corpus[i]["filename"],
                        "target_evidence_id": text_corpus[j]["evidence_id"],
                        "target_filename": text_corpus[j]["filename"],
                        "similarity_score": pct,
                        "similarity_level": "Heuristic Jaccard",
                        "shared_words_sample": list(w1 & w2)[:6]
                    })

    # Sort comparisons by similarity descending
    comparisons.sort(key=lambda x: x["similarity_score"], reverse=True)

    return {
        "case_id": case_id,
        "exact_duplicates": exact_duplicates,
        "comparisons": comparisons,
        "text_artifacts_evaluated": len(text_corpus),
        "disclaimer": "Similarity scores evaluate lexical and template overlap. They do not constitute proof of common authorship or coordinated cyber attack attribution."
    }
