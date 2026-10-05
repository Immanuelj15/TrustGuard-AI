import re
from typing import Tuple, List

# Common PII Regex Patterns
EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
PHONE_PATTERN = re.compile(r'(?:\+?91[\-\s]?)?(?:\b[6-9]\d{4}[\-\s]?\d{5}\b|\b[6-9]\d{9}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\(\d{3}\)\s*\d{3}[-.\s]?\d{4})')
IP_PATTERN = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
CREDENTIAL_PATTERN = re.compile(r'(?i)\b(?:otp|pin|cvv|password|passcode)\s*(?:is|:|=)?\s*([0-9a-zA-Z]{4,8})\b')
CARD_ACCOUNT_PATTERN = re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{11,16}\b')
UPI_PATTERN = re.compile(r'\b[a-zA-Z0-9.\-_]{2,64}@(oksbi|okhdfcbank|okaxis|paytm|ybl|apl|upi|axl|ibl|barodampay)\b', re.IGNORECASE)

def sanitize_and_redact_evidence(text: str) -> Tuple[str, bool, List[str]]:
    """
    Scans evidence text and masks personal identifiers before transmission to an external LLM.
    Returns:
        redacted_text (str): The sanitized text excerpt.
        was_redacted (bool): True if any identifier was substituted.
        redaction_notes (List[str]): Explanations of redactions performed.
    """
    if not text:
        return "", False, []

    redacted = text
    notes: List[str] = []
    
    # 1. Emails
    email_matches = EMAIL_PATTERN.findall(redacted)
    if email_matches:
        redacted = EMAIL_PATTERN.sub('[REDACTED_EMAIL]', redacted)
        notes.append(f"Masked {len(email_matches)} email address(es)")

    # 2. Sensitive Authentication Credentials / OTP
    cred_matches = CREDENTIAL_PATTERN.findall(redacted)
    if cred_matches:
        redacted = CREDENTIAL_PATTERN.sub(r'OTP/PIN: [REDACTED_AUTH_CODE]', redacted)
        notes.append("Masked sensitive authentication credential/OTP value")

    # 3. Phone Numbers
    phone_matches = PHONE_PATTERN.findall(redacted)
    if phone_matches:
        redacted = PHONE_PATTERN.sub('[REDACTED_PHONE]', redacted)
        notes.append(f"Masked {len(phone_matches)} phone number(s)")

    # 4. Bank Account / Card Numbers (11-16 consecutive digits)
    card_matches = CARD_ACCOUNT_PATTERN.findall(redacted)
    if card_matches:
        redacted = CARD_ACCOUNT_PATTERN.sub('[REDACTED_ACCOUNT_NO]', redacted)
        notes.append(f"Masked {len(card_matches)} financial account / card identifier(s)")

    # 5. Raw IPv4 Addresses
    ip_matches = IP_PATTERN.findall(redacted)
    if ip_matches:
        redacted = IP_PATTERN.sub('[REDACTED_IP]', redacted)
        notes.append(f"Masked {len(ip_matches)} IP address(es)")

    # 6. UPI Handles
    upi_matches = UPI_PATTERN.findall(redacted)
    if upi_matches:
        redacted = UPI_PATTERN.sub('[REDACTED_UPI]', redacted)
        notes.append(f"Masked {len(upi_matches)} UPI payment handle(s)")

    was_redacted = len(notes) > 0
    return redacted, was_redacted, notes

def redact_pii(text: str) -> Tuple[str, int]:
    """
    Convenience wrapper returning (redacted_text, count_of_redactions).
    """
    redacted, was_redacted, notes = sanitize_and_redact_evidence(text)
    return redacted, len(notes)

