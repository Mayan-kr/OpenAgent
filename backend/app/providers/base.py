from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Iterator

from pydantic import BaseModel, Field


class GenerationRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=32_000)
    model: str = Field(default="", max_length=200)
    temperature: float = Field(default=0.2, ge=0, le=2)
    max_tokens: int = Field(default=1_024, ge=1, le=16_384)


class GenerationResult(BaseModel):
    content: str
    model: str
    provider: str


@dataclass(frozen=True)
class ProviderDescriptor:
    name: str
    display_name: str
    configured: bool
    capabilities: tuple[str, ...]


class ModelProvider(ABC):
    descriptor: ProviderDescriptor

    @abstractmethod
    def generate(self, request: GenerationRequest) -> GenerationResult:
        raise NotImplementedError

    def stream(self, request: GenerationRequest) -> Iterator[str]:
        """The stable streaming seam; adapters can override with token-level streaming."""
        yield self.generate(request).content

    def vision(self, request: GenerationRequest, image: bytes) -> GenerationResult:
        raise NotImplementedError(f"{self.descriptor.name} does not support vision")

    def embeddings(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError(f"{self.descriptor.name} does not support embeddings")
