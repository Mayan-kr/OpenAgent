from app.providers.base import ProviderDescriptor
from app.providers.openai_compatible import OpenAICompatibleProvider
from app.schemas import ProviderConfig


def build_ephemeral_provider(config: ProviderConfig) -> OpenAICompatibleProvider:
    """Build a one-off provider from a user-supplied key. Never cached, never persisted."""
    descriptor = ProviderDescriptor(
        name="byok",
        display_name="User-supplied",
        configured=True,
        capabilities=("generate", "stream"),
    )
    return OpenAICompatibleProvider(
        descriptor, str(config.base_url), config.api_key.get_secret_value()
    )
