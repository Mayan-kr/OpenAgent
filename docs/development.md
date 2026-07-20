# Developer guide

Run the backend with `uv run --directory backend uvicorn app.main:app --reload --port 8000`, then build the extension with `npm run dev --workspace @openagent/extension`. Load `extension/dist` unpacked in Chrome.

Run `scripts/verify.ps1` for the backend test/lint suite and extension typecheck/lint/tests/build.

`backend/app/mcp_server.py` is a stdio MCP entry point. Use it from a compatible MCP client after starting the extension and sharing a page through chat. It intentionally has no write-capable browser tool yet.

The default provider is `local`, which makes development and tests deterministic. Set `OPENAGENT_PROVIDER` and the corresponding server-side key (for example `OPENAGENT_GROQ_API_KEY`) to use a configured hosted provider. Provider discovery is available at `GET /v1/providers`; secrets are never returned.

Alternatively, end users can bring their own key from the extension's Options page (any OpenAI-compatible `base_url` + model + key) instead of a server operator configuring one. It rides along on `POST /v1/chat` as `provider: {baseUrl, apiKey, model}` and is used for that one request only - see `backend/app/providers/byok.py`.

The extension sends a compressed DOM snapshot as part of page context. Use `POST /v1/dom/analyze` for structural counts or the MCP tool `browser.get_dom_snapshot` for the latest snapshot.
