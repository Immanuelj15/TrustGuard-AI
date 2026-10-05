import json
import logging
import time
import httpx
from typing import Dict, Any, Optional, List
from .config import OpenRouterConfig

logger = logging.getLogger("trustguard.openrouter")

class OpenRouterError(Exception):
    def __init__(self, message: str, status_code: int = 502, error_type: str = "provider_error"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_type = error_type

class OpenRouterClient:
    """
    Production-grade HTTP client for OpenRouter chat completions.
    Ensures safe error handling, retries with exponential backoff, 
    strict token budgeting, and zero secret leakage.
    """
    def __init__(self):
        self.base_url = OpenRouterConfig.get_base_url().rstrip('/')
        self.timeout = OpenRouterConfig.get_timeout()
        self.max_retries = OpenRouterConfig.get_max_retries()

    def _get_headers(self) -> Dict[str, str]:
        api_key = OpenRouterConfig.get_api_key()
        if not api_key or not api_key.strip():
            raise OpenRouterError(
                "OpenRouter API key is missing. Please configure OPENROUTER_API_KEY in the backend environment.",
                status_code=503,
                error_type="missing_api_key"
            )
        
        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json"
        }
        site_url = OpenRouterConfig.get_site_url()
        if site_url:
            headers["HTTP-Referer"] = site_url
        app_name = OpenRouterConfig.get_app_name()
        if app_name:
            headers["X-Title"] = app_name
            
        return headers

    def complete_chat(
        self,
        system_prompt: str,
        user_prompt: str,
        model_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends chat completion request to OpenRouter and returns validated parsed JSON.
        """
        if not OpenRouterConfig.is_enabled():
            raise OpenRouterError(
                "OpenRouter integration is currently disabled (OPENROUTER_ENABLED=false).",
                status_code=503,
                error_type="provider_disabled"
            )

        model = model_override or OpenRouterConfig.get_model()
        if not model or not model.strip():
            raise OpenRouterError(
                "No OpenRouter model configured. Set OPENROUTER_MODEL in the backend environment.",
                status_code=503,
                error_type="missing_model"
            )

        # Truncate user prompt to protect privacy and respect token limits
        if len(user_prompt) > OpenRouterConfig.MAX_INPUT_CHARS:
            user_prompt = user_prompt[:OpenRouterConfig.MAX_INPUT_CHARS] + "\n...[EXCERPT TRUNCATED FOR SAFETY]"

        headers = self._get_headers()
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": model.strip(),
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": OpenRouterConfig.MAX_OUTPUT_TOKENS,
            "temperature": 0.2,
            "response_format": {"type": "json_object"}
        }

        last_error = None
        attempt = 0
        backoff_delay = 1.0

        while attempt <= self.max_retries:
            attempt += 1
            try:
                logger.info(f"Dispatching OpenRouter explanation request (attempt {attempt}/{self.max_retries + 1}, model: {model})")
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.post(url, headers=headers, json=payload)

                if response.status_code == 200:
                    data = response.json()
                    choices = data.get("choices", [])
                    if not choices:
                        raise OpenRouterError("OpenRouter returned an empty choices array.", status_code=502)
                    
                    content_str = choices[0].get("message", {}).get("content", "").strip()
                    if not content_str:
                        raise OpenRouterError("OpenRouter returned an empty message body.", status_code=502)

                    return self._parse_json_content(content_str, model)

                elif response.status_code == 401:
                    logger.error("OpenRouter authentication failed: invalid API key")
                    raise OpenRouterError("Authentication failure with OpenRouter API. Please verify OPENROUTER_API_KEY.", status_code=401, error_type="auth_error")
                
                elif response.status_code == 404:
                    logger.error(f"OpenRouter model '{model}' not found: {response.text}")
                    raise OpenRouterError(f"Model '{model}' is not recognized or available on OpenRouter.", status_code=404, error_type="invalid_model")

                elif response.status_code == 429:
                    logger.warning(f"OpenRouter rate limit hit (429) on attempt {attempt}")
                    if attempt <= self.max_retries:
                        time.sleep(backoff_delay)
                        backoff_delay *= 2
                        continue
                    raise OpenRouterError("OpenRouter rate limit exceeded. Please retry after a brief pause.", status_code=429, error_type="rate_limited")

                elif response.status_code >= 500:
                    logger.warning(f"OpenRouter server error ({response.status_code}) on attempt {attempt}")
                    if attempt <= self.max_retries:
                        time.sleep(backoff_delay)
                        backoff_delay *= 2
                        continue
                    raise OpenRouterError(f"OpenRouter upstream service error (HTTP {response.status_code}).", status_code=502, error_type="upstream_error")

                else:
                    err_msg = f"OpenRouter request failed with HTTP {response.status_code}"
                    try:
                        err_json = response.json()
                        if "error" in err_json and "message" in err_json["error"]:
                            err_msg += f": {err_json['error']['message']}"
                    except Exception:
                        pass
                    raise OpenRouterError(err_msg, status_code=response.status_code, error_type="provider_error")

            except (httpx.TimeoutException, httpx.ConnectTimeout) as e:
                logger.warning(f"OpenRouter timeout on attempt {attempt}: {e}")
                if attempt <= self.max_retries:
                    time.sleep(backoff_delay)
                    backoff_delay *= 2
                    continue
                raise OpenRouterError(f"OpenRouter request timed out after {self.timeout} seconds.", status_code=504, error_type="timeout")

            except (httpx.NetworkError, httpx.ConnectError) as e:
                logger.warning(f"OpenRouter network connection error on attempt {attempt}: {e}")
                if attempt <= self.max_retries:
                    time.sleep(backoff_delay)
                    backoff_delay *= 2
                    continue
                raise OpenRouterError("Failed to establish network connection to OpenRouter API.", status_code=502, error_type="network_error")

            except OpenRouterError:
                raise
            except Exception as e:
                logger.error(f"Unexpected error in OpenRouter client: {e}")
                raise OpenRouterError(f"Unexpected error processing OpenRouter request: {str(e)}", status_code=500, error_type="internal_error")

        raise OpenRouterError("OpenRouter request failed after maximum retry attempts.", status_code=504, error_type="max_retries_exceeded")

    def _parse_json_content(self, content_str: str, model_id: str) -> Dict[str, Any]:
        """
        Safely extracts JSON from model content, stripping potential markdown blocks.
        """
        cleaned = content_str.strip()
        if cleaned.startswith("```"):
            # Strip markdown ```json ... ``` wrapper
            lines = cleaned.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()

        try:
            parsed = json.loads(cleaned)
            if not isinstance(parsed, dict):
                raise ValueError("Model output root must be a JSON dictionary object.")
            return parsed
        except Exception as e:
            logger.warning(f"Failed to parse strict JSON from OpenRouter output: {e}. Raw content: {cleaned[:200]}")
            # Safe structured recovery
            return {
                "summary": cleaned[:500],
                "suspicious_indicators": [],
                "possible_social_engineering_tactics": ["Unstructured model response parsed via fallback"],
                "recommended_investigation_steps": ["Review raw evidence manually", "Re-run AI explanation"],
                "limitations": [
                    "Model output could not be strictly parsed as structured JSON.",
                    "This is an automated explanation aid, not definitive legal evidence."
                ],
                "overall_assessment": "INCONCLUSIVE"
            }
