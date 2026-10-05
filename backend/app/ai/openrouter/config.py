import os
from typing import Dict, Any, Optional
from app.core.config import settings

class OpenRouterConfig:
    MAX_INPUT_CHARS: int = 4000
    MAX_OUTPUT_TOKENS: int = 1200

    @classmethod
    def get_api_key(cls) -> Optional[str]:
        return settings.OPENROUTER_API_KEY or os.environ.get("OPENROUTER_API_KEY")

    @classmethod
    def get_model(cls) -> Optional[str]:
        return settings.OPENROUTER_MODEL or os.environ.get("OPENROUTER_MODEL")

    @classmethod
    def get_base_url(cls) -> str:
        return settings.OPENROUTER_BASE_URL or os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

    @classmethod
    def is_enabled(cls) -> bool:
        env_val = os.environ.get("OPENROUTER_ENABLED")
        if env_val is not None:
            return env_val.lower() in ("true", "1", "yes")
        return bool(settings.OPENROUTER_ENABLED)

    @classmethod
    def is_configured(cls) -> bool:
        key = cls.get_api_key()
        model = cls.get_model()
        return bool(key and key.strip() and model and model.strip())

    @classmethod
    def get_timeout(cls) -> int:
        return int(settings.OPENROUTER_TIMEOUT_SECONDS or os.environ.get("OPENROUTER_TIMEOUT_SECONDS", 30))

    @classmethod
    def get_max_retries(cls) -> int:
        return int(settings.OPENROUTER_MAX_RETRIES or os.environ.get("OPENROUTER_MAX_RETRIES", 2))

    @classmethod
    def get_site_url(cls) -> Optional[str]:
        return settings.OPENROUTER_SITE_URL or os.environ.get("OPENROUTER_SITE_URL")

    @classmethod
    def get_app_name(cls) -> str:
        return settings.OPENROUTER_APP_NAME or os.environ.get("OPENROUTER_APP_NAME", "TrustGuard AI")

    @classmethod
    def get_safe_status(cls) -> Dict[str, Any]:
        """
        Returns safe configuration status for investigators and UI.
        NEVER includes or displays the API key.
        """
        configured = cls.is_configured()
        enabled = cls.is_enabled()
        model = cls.get_model()
        
        status_msg = "ready" if (enabled and configured) else ("disabled" if not enabled else "missing_configuration")

        return {
            "enabled": enabled,
            "configured": configured,
            "status": status_msg,
            "model": model if (configured or model) else None,
            "base_url": cls.get_base_url(),
            "site_url": cls.get_site_url(),
            "app_name": cls.get_app_name(),
            "disclaimer": "AI-generated explanation is an investigative aid, not proof or a legal conclusion."
        }
