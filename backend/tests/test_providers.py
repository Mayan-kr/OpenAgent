import pytest
from pydantic import ValidationError

from app.providers.base import GenerationRequest
from app.core.config import Settings
from app.providers.byok import build_ephemeral_provider
from app.providers.local import LocalProvider
from app.providers.registry import ProviderRegistry, ProviderUnavailable
from app.schemas import ProviderConfig


def test_local_provider_has_a_streaming_port() -> None:
    provider = LocalProvider()
    request = GenerationRequest(prompt="hello")
    assert list(provider.stream(request))
    assert provider.generate(request).provider == "local"


def test_unconfigured_provider_fails_closed() -> None:
    registry = ProviderRegistry(Settings(provider="groq"))
    try:
        registry.generate(GenerationRequest(prompt="hello"))
    except ProviderUnavailable as error:
        assert "groq" in str(error)
    else:
        raise AssertionError("An unconfigured provider must not silently execute")


def test_byok_config_rejects_plaintext_remote_url() -> None:
    with pytest.raises(ValidationError):
        ProviderConfig(baseUrl="http://api.groq.com/openai/v1", apiKey="sk-x", model="llama3")


def test_byok_config_allows_plaintext_localhost() -> None:
    config = ProviderConfig(baseUrl="http://127.0.0.1:11434/v1", apiKey="unused", model="llama3")
    assert config.model == "llama3"


def test_byok_config_rejects_cloud_metadata_host() -> None:
    with pytest.raises(ValidationError):
        ProviderConfig(baseUrl="https://169.254.169.254/latest", apiKey="sk-x", model="llama3")


def test_build_ephemeral_provider_is_never_cached() -> None:
    config = ProviderConfig(
        baseUrl="https://api.groq.com/openai/v1", apiKey="sk-secret", model="llama3"
    )
    provider = build_ephemeral_provider(config)
    assert provider.descriptor.name == "byok"
    assert build_ephemeral_provider(config) is not provider
