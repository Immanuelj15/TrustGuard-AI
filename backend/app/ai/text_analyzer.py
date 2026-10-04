import re
from typing import Dict, List, Any

INDICATOR_RULES = [
    {
        "id": "OTP_CREDENTIAL_SOLICITATION",
        "category": "Credential Harvesting",
        "severity": "CRITICAL",
        "weight": 35.0,
        "patterns": [
            r"\b(one[- ]time[- ]password|otp|pin|cvv|password|passcode)\b",
            r"\b(share|send|enter|verify)\s+(your|the)?\s*(otp|pin|code)\b",
            r"\botp\s+(batao|bhejo|share karo)\b",  # Hindi transliterated
            r"\botp\s+(solla|anuppu)\b"  # Tamil transliterated
        ],
        "description": "Direct request for sensitive authentication credentials (OTP/PIN/Password)."
    },
    {
        "id": "IMPERSONATION_AUTHORITY",
        "category": "Authority Impersonation",
        "severity": "HIGH",
        "weight": 30.0,
        "patterns": [
            r"\b(cbi|police|customs|enforcement directorate|ed officer|narcotics|telecom department|dot|reserve bank|rbi|interpol)\b",
            r"\b(cyber\s*crime\s*department|crime\s*branch|supreme\s*court)\b",
            r"\b(arrest warrant|digital arrest|fir filed|non-bailable warrant)\b",
            r"\b(police thana|jail bhej denge|girftari)\b"  # Hindi
        ],
        "description": "Impersonation of law enforcement, government agencies, or financial regulators."
    },
    {
        "id": "URGENT_FINANCIAL_DEMAND",
        "category": "Coercive Transfer",
        "severity": "HIGH",
        "weight": 25.0,
        "patterns": [
            r"\b(transfer|send|pay|deposit)\s+(?:(?:rs\.?|inr|\$|€|£)?\s*\d+[\d,.]*\s+)?(immediately|urgently|within\s+\d+\s*(minutes|hours|mins))\b",
            r"\b(account\s+will\s+be\s+(suspended|blocked|frozen|deactivated|closed))\b",
            r"\b(turant|jaldi)\s+(paise|bhejo|transfer karo)\b",
            r"\b(udane|panam)\s+(anuppu|katta vendum)\b"
        ],
        "description": "Urgent demand for financial transfer under threat of immediate adverse consequences."
    },
    {
        "id": "REMOTE_ACCESS_MALWARE",
        "category": "Device Compromise",
        "severity": "CRITICAL",
        "weight": 30.0,
        "patterns": [
            r"\b(anydesk|teamviewer|rustdesk|quicksupport|airdroid)\b",
            r"\b(install|download)\s+.*(\.apk|screen\s*share|remote\s*access)\b",
            r"\bapk\s+(file|download|install)\b"
        ],
        "description": "Instructions to install remote administration or suspicious application files (APK)."
    },
    {
        "id": "SUSPICIOUS_PAYMENT_CHANNELS",
        "category": "Fraudulent Settlement",
        "severity": "MEDIUM",
        "weight": 20.0,
        "patterns": [
            r"\b(gift\s*card|crypto|bitcoin|usdt|telegram\s*wallet)\b",
            r"\b[a-zA-Z0-9.\-_]{2,256}@(oksbi|okhdfcbank|okaxis|paytm|ybl|apl)\b"  # Suspicious unverified UPI strings
        ],
        "description": "Unconventional or obfuscated payment channels often used in cyber fraud."
    },
    {
        "id": "PHISHING_URL_PATTERN",
        "category": "Deceptive Infrastructure",
        "severity": "HIGH",
        "weight": 25.0,
        "patterns": [
            r"https?://(?:bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly|rb\.gy)/[a-zA-Z0-9_-]+",
            r"https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?",
            r"https?://[a-zA-Z0-9-]+\.(?:xyz|top|work|click|club|buzz|rest)/[^\s]*"
        ],
        "description": "Obfuscated shortened URLs, direct raw IP addresses, or suspicious top-level domains."
    }
]

def analyze_scam_text(text: str) -> Dict[str, Any]:
    findings = []
    total_score = 0.0
    matched_categories = set()

    for rule in INDICATOR_RULES:
        rule_matches = []
        for pattern in rule["patterns"]:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                snippet_start = max(0, match.start() - 30)
                snippet_end = min(len(text), match.end() + 30)
                rule_matches.append({
                    "matched_text": match.group(0),
                    "context_snippet": text[snippet_start:snippet_end].strip(),
                    "start_pos": match.start(),
                    "end_pos": match.end()
                })
        
        if rule_matches:
            findings.append({
                "rule_id": rule["id"],
                "category": rule["category"],
                "severity": rule["severity"],
                "description": rule["description"],
                "matches": rule_matches,
                "weight_contribution": rule["weight"]
            })
            total_score += rule["weight"]
            matched_categories.add(rule["category"])

    # Normalization into 0 - 100 risk score
    # Bonus points for multi-factor correlation (e.g. impersonation + urgent transfer + OTP)
    correlation_multiplier = 1.0
    if len(matched_categories) >= 3:
        correlation_multiplier = 1.25
    elif len(matched_categories) >= 2:
        correlation_multiplier = 1.1

    final_score = min(100.0, round(total_score * correlation_multiplier, 1))

    if final_score >= 70:
        risk_level = "CRITICAL" if final_score >= 85 else "HIGH"
    elif final_score >= 40:
        risk_level = "MEDIUM"
    elif final_score > 0:
        risk_level = "LOW"
    else:
        risk_level = "LOW"

    limitations = [
        "Rule-based detection identifies syntactic and semantic scam patterns, not criminal culpability.",
        "Legitimate urgent alerts (e.g., bank fraud notifications) may trigger keyword matches and require context verification.",
        "Investigation notes and corroborating telemetry should be reviewed before taking administrative or legal action."
    ]

    # Optional Hugging Face transformer classification
    hf_metadata = None
    try:
        from .hf.text_classifier import HuggingFaceTextClassifier
        hf_pred = HuggingFaceTextClassifier.get_instance().predict(text)
        if hf_pred and "predicted_label" in hf_pred:
            hf_metadata = hf_pred
            # If transformer also flags suspicious and risk is low, bump to medium for review
            if hf_pred["predicted_label"] == "suspicious" and final_score < 40.0:
                final_score = max(final_score, round(hf_pred["risk_score"] * 0.5, 1))
                if final_score >= 40.0:
                    risk_level = "MEDIUM"
    except Exception:
        hf_metadata = None

    model_name = "TrustGuard-Ensemble-SocialEng" if hf_metadata else "TrustGuard-RuleEngine-SocialEng"

    findings_payload = {
        "total_indicators_found": sum(len(f["matches"]) for f in findings),
        "distinct_indicator_categories": list(matched_categories),
        "indicators": findings
    }
    if hf_metadata:
        findings_payload["hf_transformer_inference"] = hf_metadata

    return {
        "analysis_type": "text",
        "model_name": model_name,
        "model_version": "v1.4-multilingual",
        "risk_level": risk_level,
        "risk_score": final_score,
        "model_confidence": 0.88 if len(findings) > 0 else 0.95,
        "findings": findings_payload,
        "limitations": limitations
    }
