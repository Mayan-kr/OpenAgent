import httpx

from app.providers.base import (
    GenerationRequest,
    GenerationResult,
    ModelProvider,
    ProviderDescriptor,
)


class ProviderRequestFailed(RuntimeError):
    """Raised when an upstream OpenAI-compatible call fails. Message never includes the API key."""


class OpenAICompatibleProvider(ModelProvider):
    """Adapter for OpenAI-shaped APIs such as OpenAI, Groq, and OpenRouter."""

    def __init__(self, descriptor: ProviderDescriptor, endpoint: str, api_key: str) -> None:
        self.descriptor = descriptor
        self._endpoint = endpoint.rstrip("/")
        self._api_key = api_key

    def generate(self, request: GenerationRequest) -> GenerationResult:
        messages: list[dict[str, str]] = []
        if request.system:
            messages.append({"role": "system", "content": request.system})
        messages.append({"role": "user", "content": request.prompt})
        payload = {
            "model": request.model,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }
        try:
            with httpx.Client(timeout=60) as client:
                response = client.post(
                    f"{self._endpoint}/chat/completions",
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json=payload,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as error:
            raise ProviderRequestFailed(
                f"{self.descriptor.name} rejected the request ({error.response.status_code})"
            ) from None
        except httpx.HTTPError:
            raise ProviderRequestFailed(f"{self.descriptor.name} is unreachable") from None
        content = response.json()["choices"][0]["message"]["content"]
        return GenerationResult(content=content, model=request.model, provider=self.descriptor.name)
