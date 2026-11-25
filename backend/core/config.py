"""Cấu hình ứng dụng từ biến môi trường (và tệp .env ở thư mục gốc dự án, nếu có).

Không phụ thuộc python-dotenv: tệp .env được đọc bằng một bộ phân tích đơn giản
(KEY=VALUE, bỏ qua dòng trống và dòng bắt đầu bằng #). Biến môi trường thật luôn
được ưu tiên hơn giá trị trong .env.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Mapping

BASE_DIR = Path(__file__).resolve().parents[2]
APP_VERSION = "6.0.0"

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://v-code-edu.web.app",
    "https://v-code-edu.firebaseapp.com",
)


def parse_dotenv(text: str) -> dict[str, str]:
    """Phân tích nội dung tệp .env đơn giản."""
    values: dict[str, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key or not key.replace("_", "").isalnum():
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        else:
            # cắt chú thích cuối dòng: VALUE  # comment
            hash_pos = value.find(" #")
            if hash_pos != -1:
                value = value[:hash_pos].rstrip()
        values[key] = value
    return values


def load_env(env_file: Path | None = None) -> dict[str, str]:
    """Gộp .env (nếu có) với os.environ; os.environ thắng."""
    merged: dict[str, str] = {}
    path = env_file if env_file is not None else BASE_DIR / ".env"
    try:
        if path and path.is_file():
            merged.update(parse_dotenv(path.read_text(encoding="utf-8")))
    except OSError:
        pass
    merged.update(os.environ)
    return merged


def _bool(value: str | None, default: bool) -> bool:
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in ("1", "true", "yes", "on", "y")


def _int(value: str | None, default: int, minimum: int | None = None) -> int:
    try:
        result = int(str(value).strip()) if value is not None and str(value).strip() != "" else default
    except ValueError:
        result = default
    if minimum is not None and result < minimum:
        result = minimum
    return result


def _float(value: str | None, default: float) -> float:
    try:
        return float(str(value).strip()) if value is not None and str(value).strip() != "" else default
    except ValueError:
        return default


def _list(value: str | None, default: tuple[str, ...]) -> tuple[str, ...]:
    if value is None or value.strip() == "":
        return default
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    app_version: str = APP_VERSION
    environment: str = "development"
    log_level: str = "INFO"

    database_url: str = f"sqlite:///{(BASE_DIR / 'vcode_edu.db').as_posix()}"

    firebase_project_id: str = "v-code-edu"
    allowed_origins: tuple[str, ...] = DEFAULT_ALLOWED_ORIGINS
    trust_proxy: bool = False

    serve_frontend: bool = True
    frontend_dir: Path = BASE_DIR

    ai_provider_order: tuple[str, ...] = ("gemini", "openai", "anthropic", "ollama")
    ai_rate_per_minute: int = 12
    ai_daily_limit_user: int = 200
    ai_daily_limit_guest: int = 30
    ai_max_output_tokens: int = 2048
    ai_temperature: float = 0.4
    ai_connect_timeout: float = 10.0
    ai_read_timeout: float = 60.0
    ai_total_timeout: float = 120.0

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = "https://api.openai.com/v1"
    openai_token_param: str = "max_tokens"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-5-5"
    anthropic_base_url: str = "https://api.anthropic.com"

    ollama_enabled: bool = True
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:3b"

    extra: dict = field(default_factory=dict)

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


def settings_from_env(env: Mapping[str, str] | None = None) -> Settings:
    e = dict(env) if env is not None else load_env()
    defaults = Settings()
    order = tuple(p.lower() for p in _list(e.get("AI_PROVIDER_ORDER"), defaults.ai_provider_order))
    token_param = (e.get("OPENAI_TOKEN_PARAM") or defaults.openai_token_param).strip()
    if token_param not in ("max_tokens", "max_completion_tokens"):
        token_param = defaults.openai_token_param
    return Settings(
        environment=(e.get("APP_ENV") or defaults.environment).strip(),
        log_level=(e.get("LOG_LEVEL") or defaults.log_level).strip().upper(),
        database_url=(e.get("DATABASE_URL") or defaults.database_url).strip(),
        firebase_project_id=(e.get("FIREBASE_PROJECT_ID") or defaults.firebase_project_id).strip(),
        allowed_origins=_list(e.get("ALLOWED_ORIGINS"), defaults.allowed_origins),
        trust_proxy=_bool(e.get("TRUST_PROXY"), defaults.trust_proxy),
        serve_frontend=_bool(e.get("SERVE_FRONTEND"), defaults.serve_frontend),
        frontend_dir=Path(e["FRONTEND_DIR"]).resolve() if e.get("FRONTEND_DIR") else defaults.frontend_dir,
        ai_provider_order=order,
        ai_rate_per_minute=_int(e.get("AI_RATE_PER_MINUTE"), defaults.ai_rate_per_minute, 1),
        ai_daily_limit_user=_int(e.get("AI_DAILY_LIMIT_USER"), defaults.ai_daily_limit_user, 0),
        ai_daily_limit_guest=_int(e.get("AI_DAILY_LIMIT_GUEST"), defaults.ai_daily_limit_guest, 0),
        ai_max_output_tokens=_int(e.get("AI_MAX_OUTPUT_TOKENS"), defaults.ai_max_output_tokens, 64),
        ai_temperature=_float(e.get("AI_TEMPERATURE"), defaults.ai_temperature),
        ai_connect_timeout=_float(e.get("AI_CONNECT_TIMEOUT"), defaults.ai_connect_timeout),
        ai_read_timeout=_float(e.get("AI_READ_TIMEOUT"), defaults.ai_read_timeout),
        ai_total_timeout=_float(e.get("AI_TOTAL_TIMEOUT"), defaults.ai_total_timeout),
        gemini_api_key=(e.get("GEMINI_API_KEY") or "").strip(),
        gemini_model=(e.get("GEMINI_MODEL") or defaults.gemini_model).strip(),
        gemini_base_url=(e.get("GEMINI_BASE_URL") or defaults.gemini_base_url).strip().rstrip("/"),
        openai_api_key=(e.get("OPENAI_API_KEY") or "").strip(),
        openai_model=(e.get("OPENAI_MODEL") or defaults.openai_model).strip(),
        openai_base_url=(e.get("OPENAI_BASE_URL") or defaults.openai_base_url).strip().rstrip("/"),
        openai_token_param=token_param,
        anthropic_api_key=(e.get("ANTHROPIC_API_KEY") or "").strip(),
        anthropic_model=(e.get("ANTHROPIC_MODEL") or defaults.anthropic_model).strip(),
        anthropic_base_url=(e.get("ANTHROPIC_BASE_URL") or defaults.anthropic_base_url).strip().rstrip("/"),
        ollama_enabled=_bool(e.get("OLLAMA_ENABLED"), defaults.ollama_enabled),
        ollama_base_url=(e.get("OLLAMA_BASE_URL") or defaults.ollama_base_url).strip().rstrip("/"),
        ollama_model=(e.get("OLLAMA_MODEL") or defaults.ollama_model).strip(),
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return settings_from_env()


def reload_settings() -> Settings:
    get_settings.cache_clear()
    return get_settings()
