from app.providers.base import (
    GenerationRequest,
    GenerationResult,
    ModelProvider,
    ProviderDescriptor,
)


class LocalProvider(ModelProvider):
    descriptor = ProviderDescriptor(
        name="local",
        display_name="Local deterministic",
        configured=True,
        capabilities=("generate", "stream"),
    )

    def generate(self, request: GenerationRequest) -> GenerationResult:
        return GenerationResult(
            content="The local provider is ready. Connect Ollama or a hosted provider to enable model reasoning.",
            model=request.model or "local",
            provider=self.descriptor.name,
        )
