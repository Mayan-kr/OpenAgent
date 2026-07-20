from app.core.config import Settings, get_settings
from app.providers.base import (
    GenerationRequest,
    GenerationResult,
    ModelProvider,
    ProviderDescriptor,
)
from app.providers.local import LocalProvider
from app.providers.openai_compatible import OpenAICompatibleProvider


class ProviderUnavailable(RuntimeError):
    pass


class ProviderRegistry:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._providers: dict[str, ModelProvider] = {"local": LocalProvider()}
        self._register_compatible_providers()

    def _register_compatible_providers(self) -> None:
        configured = {
            "openai": ("OpenAI", "https://api.openai.com/v1", self._settings.openai_api_key),
            "groq": ("Groq", "https://api.groq.com/openai/v1", self._settings.groq_api_key),
            "openrouter": (
                "OpenRouter",
                "https://openrouter.ai/api/v1",
                self._settings.openrouter_api_key,
            ),
            "ollama": ("Ollama", self._settings.ollama_base_url, None),
        }
        for name, (display_name, endpoint, key) in configured.items():
            if key is not None:
                self._providers[name] = OpenAICompatibleProvider(
                    ProviderDescriptor(name, display_name, True, ("generate", "stream")),
                    endpoint,
                    key.get_secret_value(),
                )

    def descriptors(self) -> list[ProviderDescriptor]:
        configured_names = set(self._providers)
        return [
            ProviderDescriptor("local", "Local deterministic", True, ("generate", "stream")),
            ProviderDescriptor(
                "ollama", "Ollama", "ollama" in configured_names, ("generate", "stream")
            ),
            ProviderDescriptor("groq", "Groq", "groq" in configured_names, ("generate", "stream")),
            ProviderDescriptor(
                "openai", "OpenAI", "openai" in configured_names, ("generate", "stream")
            ),
            ProviderDescriptor(
                "openrouter", "OpenRouter", "openrouter" in configured_names, ("generate", "stream")
            ),
            ProviderDescriptor(
                "gemini",
                "Gemini",
                self._settings.gemini_api_key is not None,
                ("generate", "vision"),
            ),
        ]

    def active_name(self) -> str:
        return self._settings.provider

    def model_name(self) -> str:
        return self._settings.model

    def generate(self, request: GenerationRequest) -> GenerationResult:
        provider = self._providers.get(self.active_name())
        if provider is None:
            raise ProviderUnavailable(f"Provider '{self.active_name()}' is not configured")
        return provider.generate(request)


provider_registry = ProviderRegistry()
