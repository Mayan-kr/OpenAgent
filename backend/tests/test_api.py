from fastapi.testclient import TestClient

from app.main import app
from app.services.page_context import page_context_store

client = TestClient(app)


def test_health_reports_service_status() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_chat_rejects_unbounded_or_unknown_page_data() -> None:
    response = client.post(
        "/v1/chat", json={"message": "summarize", "page": {"url": "https://example.com"}}
    )
    assert response.status_code == 422


def test_chat_stores_read_only_context() -> None:
    response = client.post(
        "/v1/chat",
        json={
            "message": "summarize",
            "page": {
                "url": "https://example.com/",
                "title": "Example",
                "text": "Example page",
                "selectedText": "",
                "interactiveElements": [],
            },
        },
    )
    assert response.status_code == 200
    # The read-only page context is persisted for the MCP side to read back.
    latest = page_context_store.latest()
    assert latest is not None
    assert latest.title == "Example"


def test_mcp_tool_catalog_marks_actions_as_approval_gated() -> None:
    response = client.get("/v1/mcp/tools")
    assert response.status_code == 200
    actions = {tool["name"]: tool["safety"] for tool in response.json()["tools"]}
    assert actions["browser.request_action"] == "requires_user_approval"


def test_provider_discovery_does_not_expose_secrets() -> None:
    response = client.get("/v1/providers")
    assert response.status_code == 200
    assert response.json()["active"] == "local"
    assert "api_key" not in response.text


def test_chat_with_byok_provider_never_echoes_the_key(monkeypatch) -> None:
    captured: dict[str, object] = {}

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"choices": [{"message": {"content": "hello from byok"}}]}

    class FakeClient:
        def __init__(self, timeout: int) -> None:
            pass

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, url: str, headers: dict, json: dict) -> FakeResponse:
            captured["url"] = url
            captured["headers"] = headers
            captured["body"] = json
            return FakeResponse()

    monkeypatch.setattr("app.providers.openai_compatible.httpx.Client", FakeClient)

    response = client.post(
        "/v1/chat",
        json={
            "message": "summarize",
            "page": {
                "url": "https://example.com/",
                "title": "Example",
                "text": "Distinctive page body text about widgets",
                "selectedText": "",
                "interactiveElements": [],
            },
            "provider": {
                "baseUrl": "https://api.groq.com/openai/v1",
                "apiKey": "sk-super-secret",
                "model": "llama-3.3-70b-versatile",
            },
        },
    )
    assert response.status_code == 200
    assert "hello from byok" in response.json()["message"]
    assert "sk-super-secret" not in response.text
    assert captured["headers"]["Authorization"] == "Bearer sk-super-secret"
    assert captured["url"] == "https://api.groq.com/openai/v1/chat/completions"
    # The page content must actually reach the model as a system message, otherwise the
    # model is answering blind (the bug where it kept asking for context it "had").
    messages = captured["body"]["messages"]
    system = next(message for message in messages if message["role"] == "system")
    assert "Distinctive page body text about widgets" in system["content"]
    assert any(
        message["role"] == "user" and message["content"] == "summarize" for message in messages
    )


def test_chat_rejects_plaintext_remote_provider_url() -> None:
    response = client.post(
        "/v1/chat",
        json={
            "message": "summarize",
            "page": {
                "url": "https://example.com/",
                "title": "Example",
                "text": "Example page",
                "selectedText": "",
                "interactiveElements": [],
            },
            "provider": {
                "baseUrl": "http://api.groq.com/openai/v1",
                "apiKey": "sk-x",
                "model": "llama-3.3-70b-versatile",
            },
        },
    )
    assert response.status_code == 422
