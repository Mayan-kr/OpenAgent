from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, SecretStr, field_validator


class InteractiveElement(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str = Field(max_length=100)
    label: str = Field(max_length=160)
    selector: str = Field(max_length=500)
    disabled: bool


class DomNode(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tag: str = Field(max_length=40)
    role: str | None = Field(default=None, max_length=100)
    name: str | None = Field(default=None, max_length=200)
    selector: str = Field(max_length=500)
    text: str = Field(default="", max_length=240)
    children: list["DomNode"] = Field(default_factory=list, max_length=20)


class FormSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    selector: str = Field(max_length=500)
    action: str = Field(default="", max_length=500)
    method: str = Field(default="get", max_length=10)
    fields: list[str] = Field(default_factory=list, max_length=40)


class TableSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    selector: str = Field(max_length=500)
    caption: str = Field(default="", max_length=240)
    headers: list[str] = Field(default_factory=list, max_length=30)
    row_count: int = Field(default=0, ge=0, le=1000, alias="rowCount")


class DomSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    landmarks: list[str] = Field(default_factory=list, max_length=30)
    headings: list[str] = Field(default_factory=list, max_length=100)
    forms: list[FormSummary] = Field(default_factory=list, max_length=30)
    tables: list[TableSummary] = Field(default_factory=list, max_length=30)
    tree: list[DomNode] = Field(default_factory=list, max_length=200)


class PageContext(BaseModel):
    """A deliberately compressed, sanitized representation of a browser page."""

    model_config = ConfigDict(extra="forbid")

    url: AnyHttpUrl
    title: str = Field(max_length=500)
    text: str = Field(max_length=12_000)
    selected_text: str = Field(default="", alias="selectedText", max_length=4_000)
    interactive_elements: list[InteractiveElement] = Field(
        default_factory=list, alias="interactiveElements", max_length=80
    )
    dom: DomSnapshot | None = None


_BLOCKED_PROVIDER_HOSTS = {"169.254.169.254", "metadata.google.internal"}


class ProviderConfig(BaseModel):
    """User-supplied bring-your-own-key provider config, used once per request and never persisted."""

    model_config = ConfigDict(extra="forbid")

    base_url: AnyHttpUrl = Field(alias="baseUrl")
    api_key: SecretStr = Field(alias="apiKey", min_length=1, max_length=400)
    model: str = Field(min_length=1, max_length=200)

    @field_validator("base_url")
    @classmethod
    def _require_safe_transport(cls, value: AnyHttpUrl) -> AnyHttpUrl:
        host = value.host or ""
        if host in _BLOCKED_PROVIDER_HOSTS:
            raise ValueError("base_url may not target cloud metadata endpoints")
        if value.scheme != "https" and host not in ("localhost", "127.0.0.1"):
            raise ValueError("base_url must use https, except for a local model server")
        return value


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=8_000)
    page: PageContext
    provider: ProviderConfig | None = None


class ChatResponse(BaseModel):
    message: str
    tool_hints: list[str] = Field(alias="toolHints")


class ExtensionHello(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["hello"]
    extension_id: str = Field(alias="extensionId", min_length=1, max_length=200)
    version: str = Field(min_length=1, max_length=50)


class ActionRequest(BaseModel):
    action: Literal["click", "type", "navigate"]
    reason: str = Field(min_length=1, max_length=500)
    target: str | None = Field(default=None, max_length=500)


class DomAnalyzeResponse(BaseModel):
    url: AnyHttpUrl
    title: str
    semantic_summary: str = Field(alias="semanticSummary")
    landmark_count: int = Field(alias="landmarkCount")
    heading_count: int = Field(alias="headingCount")
    form_count: int = Field(alias="formCount")
    table_count: int = Field(alias="tableCount")
    interactive_count: int = Field(alias="interactiveCount")
