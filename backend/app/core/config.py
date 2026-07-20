from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime config for server-operated providers. These secrets stay in the environment.

    Users may separately bring their own key per-request (ChatRequest.provider /
    app.providers.byok) - those live only in the extension's local storage, never here.
    """

    model_config = SettingsConfigDict(env_file=".env", env_prefix="OPENAGENT_")

    allowed_origins: str = "http://localhost,http://127.0.0.1"
    max_page_text_length: int = 12_000
    data_path: str = "./data/openagent.sqlite3"
    provider: str = "local"
    model: str = "local"
    groq_api_key: SecretStr | None = None
    openai_api_key: SecretStr | None = None
    openrouter_api_key: SecretStr | None = None
    gemini_api_key: SecretStr | None = None
    ollama_base_url: str = "http://127.0.0.1:11434/v1"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
