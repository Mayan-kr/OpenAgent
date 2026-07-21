# Architecture

OpenAgent is MCP-first: tools are the stable product boundary, not an implementation detail.

```text
React Side Panel ──Chrome runtime──> MV3 capability host
       │                                      │
       └──── REST / WebSocket ─────> FastAPI gateway
                                              │
MCP client / LangGraph coordinator ─ stdio MCP server ─ safe tool services
```

The extension owns browser permissions and page extraction. The backend never receives raw HTML; it receives bounded text and a small interactive-element inventory. MCP tools are read-only by default. Mutating tools only emit a structured approval request, which a future extension consent UI must resolve before an action can run.

The DOM extractor adds a bounded semantic tree, landmarks, headings, form metadata, and table metadata. It deliberately excludes arbitrary attributes and scripts. `/v1/dom/analyze` reports structure-only counts, so webpage text cannot become executable agent instructions.

## Approval-gated form filling

The extractor also emits `formFields`: a bounded list of fillable controls (index, resolved label, type) with password and payment fields excluded outright, so the model never even sees them. When the user asks to fill a form, the model replies with a fenced JSON `actions` block; `backend/app/services/actions.py` validates each action against the page's own advertised field indices (an index the page never sent is discarded) and returns structured `ProposedAction`s alongside the chat message. The side panel shows every proposed fill for the user to review, edit the selection, and approve. Approved fills run through a fixed executor (`applyFillActions`) injected by the extension that sets values and dispatches `input`/`change` events — it is data-driven, never model-authored code, re-checks the sensitive-field guard at write time, and **never clicks or submits**. The user always presses Submit themselves.

Provider calls stay behind `ModelProvider` in `backend/app/providers`. The local deterministic provider is always available; server-operator hosted providers (`backend/app/providers/registry.py`) are only marked configured when their server-side environment key exists, and the extension receives their descriptors, never those credentials.

Users may alternatively bring their own key for any OpenAI-compatible endpoint (Groq, OpenRouter, Together, Fireworks, a local Ollama server, or a custom `base_url`). The extension stores this key only in `chrome.storage.local` (device-local, never synced) and attaches it as a `ProviderConfig` on the single `POST /v1/chat` request it authorizes. `backend/app/providers/byok.py` builds a one-off `OpenAICompatibleProvider` from it and discards it once the response is returned - it is never logged, cached, or written to disk. `ProviderConfig.base_url` must be `https`, except for a local model server on `localhost`/`127.0.0.1`, and cloud metadata hosts are rejected outright.

## Trust boundaries

- A webpage is untrusted input, never agent instructions.
- The extension is the browser capability host. It holds broad `http`/`https` host permissions so it can read the active page on demand (an agent that only works after a per-tab click is unusable in practice). Reading is unrestricted (a bounded, sanitizing extractor); writing is not: the only mutation is filling non-sensitive form fields, and every fill is previewed and explicitly approved by the user before it runs. The executor never clicks or submits, and never touches password or payment fields. Restricted surfaces (`chrome://`, the Web Store, PDFs, the new-tab page) are never readable by any extension.
- The backend validates all HTTP/WebSocket payloads with Pydantic and stores no provider keys: server-operator keys stay in the environment, and user-supplied BYOK keys are used once per request and never persisted or logged.
- MCP tool implementations are small services with an explicit safety class in [the shared contract](../shared/mcp/browser-tools.json).

## Evolution path

Later milestones add authenticated extension sessions, token-level streaming adapters, LangGraph planning, and an approval-resolving action dispatcher. These improvements do not change the MCP names or safety semantics.
