# OpenAgent — Getting Started Guide

A step-by-step guide to run OpenAgent locally: start the backend, load the Chrome
extension, connect your own model API key, and chat with any web page.

OpenAgent has two parts that both need to be running:

1. **Backend** — a local FastAPI server (the MCP gateway) on `http://127.0.0.1:8000`.
2. **Extension** — a Chrome side panel you load unpacked from `extension/dist`.

Your model API key lives **only** in the extension's local storage and is sent with each
chat request. It is never synced to another device and never stored on the backend.

---

## 1. Prerequisites

Install these once:

- **Python 3.11+** and **[uv](https://docs.astral.sh/uv/getting-started/installation/)** (the Python runner/installer)
- **Node.js 20+** (includes `npm`)
- **Google Chrome** (or any Chromium browser with MV3 side-panel support)
- An API key from any OpenAI-compatible provider — e.g. **Groq**, OpenAI, OpenRouter, Together, Fireworks, or a local **Ollama** server. (Groq has a free tier and is the easiest to start with.)

Check your versions:

```powershell
python --version
uv --version
node --version
```

---

## 2. One-time setup

From the repository root (`OpenAgent/`):

```powershell
# Install backend dependencies into backend/.venv
uv sync --directory backend

# Install extension dependencies
npm install
```

---

## 3. Start the backend

You need the backend running whenever you use the extension. Two options:

### Option A — run directly with uv (recommended for development)

```powershell
uv run --directory backend uvicorn app.main:app --reload --port 8000
```

Leave this terminal open. You should see `Uvicorn running on http://127.0.0.1:8000`.

Verify it is up (in another terminal or your browser):

```powershell
curl http://127.0.0.1:8000/health
# -> {"status":"ok","service":"openagent-backend","extensionConnections":0}
```

### Option B — run with Docker

```powershell
docker compose -f docker/docker-compose.yml up --build
```

This serves the same backend on `http://127.0.0.1:8000`.

---

## 4. Build and load the extension

### Build it

```powershell
# One-off build
npm run build --workspace @openagent/extension

# ...or rebuild automatically on every source change:
npm run dev --workspace @openagent/extension
```

Both write the loadable extension to `extension/dist`.

### Load it into Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `extension/dist` folder.
4. (Recommended) Click the puzzle-piece icon in the toolbar and **pin** OpenAgent.

### Grant site access (important)

OpenAgent reads the page you are on, so Chrome needs site access:

1. On the OpenAgent card in `chrome://extensions`, click **Details**.
2. Under **Site access**, choose **On all sites**.

Without this, reading a page fails with a permission error.

---

## 5. Connect your model (add your API key)

1. Open any normal website (not `chrome://…`, the Chrome Web Store, a PDF, or a new-tab page — those are unreadable by any extension).
2. Click the OpenAgent toolbar icon to open the side panel.
3. Click the **⚙ gear icon** in the side panel header (top-right) to open the settings page.
4. Fill in the **Model provider** section:
   - **Provider** — pick a preset (e.g. `Groq`). This auto-fills the Base URL and a default Model.
   - **Base URL** — filled by the preset; edit only if you chose `Custom`.
   - **Model** — pre-filled with a sensible default; change it to any model your account can use.
   - **API key** — paste your provider key (e.g. a Groq `gsk_...` key).
5. Click **Save**. You should see **"Saved. Using <model>."**

Provider presets and their default models:

| Provider       | Base URL                                | Default model                                       |
| -------------- | --------------------------------------- | --------------------------------------------------- |
| OpenAI         | `https://api.openai.com/v1`             | `gpt-4o-mini`                                       |
| Groq           | `https://api.groq.com/openai/v1`        | `llama-3.3-70b-versatile`                           |
| OpenRouter     | `https://openrouter.ai/api/v1`          | `meta-llama/llama-3.3-70b-instruct`                 |
| Together AI    | `https://api.together.xyz/v1`           | `meta-llama/Llama-3.3-70B-Instruct-Turbo`           |
| Fireworks AI   | `https://api.fireworks.ai/inference/v1` | `accounts/fireworks/models/llama-v3p3-70b-instruct` |
| Ollama (local) | `http://127.0.0.1:11434/v1`             | `llama3.2`                                          |
| Custom         | _(your endpoint)_                       | _(your model)_                                      |

> Leave the API key **blank** to fall back to the backend's own built-in provider
> (the deterministic `local` provider by default).

---

## 6. Use it

1. Go to a web page you want to ask about.
2. Open the OpenAgent side panel (toolbar icon, or the `Alt+Shift+O` shortcut).
3. The header should read **"Local agent online · <your model>"**.
4. Type a question about the page and hit **Send**.

The extension sends a bounded, read-only snapshot of the page plus your message to your
chosen model. This milestone is **read-only** — the agent never clicks or types on the page.

---

## 7. Troubleshooting

**"Cannot access contents of the page" / "Extension manifest must request permission…"**
The page is restricted (`chrome://`, Web Store, PDF, new-tab) — open a normal website — or
site access isn't granted. Set **Site access → On all sites** (step 4) and reload the extension.

**Header says "no API key set" and replies come from the "local provider"**
Your key isn't saved. Open ⚙ settings, make sure **Provider**, **Base URL**, **Model**, and
**API key** are all filled, then **Save** — you should see "Saved. Using <model>." If a field
is missing while the key is set, the page now shows a validation error instead of silently
discarding the key.

**A `502` error appears in the chat**
The backend reached your provider but the call was rejected — usually a bad/expired key or a
model your account can't access. Double-check the key and that the **Model** name is valid for
that provider.

**"Backend unavailable" in the header**
The backend isn't running or isn't on `http://127.0.0.1:8000`. Start it (step 3) and confirm
`curl http://127.0.0.1:8000/health` returns `ok`. If you run the backend on a different URL,
update **Backend URL** in ⚙ settings.

**I changed the code but nothing changed**
Rebuild (`npm run build --workspace @openagent/extension`), then click the **reload** (↻) icon
on the OpenAgent card in `chrome://extensions`.

---

## 8. Optional extras

### Configure a provider on the server instead of per-user

If you'd rather the backend hold the key (so users don't each bring one), set environment
variables before starting it (see `backend/.env.example`):

```powershell
$env:OPENAGENT_PROVIDER = "groq"
$env:OPENAGENT_MODEL = "llama-3.3-70b-versatile"
$env:OPENAGENT_GROQ_API_KEY = "gsk_..."
uv run --directory backend uvicorn app.main:app --reload --port 8000
```

Other supported keys: `OPENAGENT_OPENAI_API_KEY`, `OPENAGENT_OPENROUTER_API_KEY`,
`OPENAGENT_GEMINI_API_KEY`, and `OPENAGENT_OLLAMA_BASE_URL`. Check available providers at
`GET /v1/providers` (secrets are never returned).

### Use the stdio MCP server from an MCP client

```powershell
uv run --directory backend python -m app.mcp_server
```

### Run the test / lint / format suite

```powershell
# Everything (backend + extension)
powershell -File scripts/verify.ps1

# Or individually
uv run --directory backend pytest
npm run lint --workspace @openagent/extension
npm run test --workspace @openagent/extension
```

---

## Further reading

- [Architecture](docs/architecture.md) — trust boundaries, MCP-first design, the provider layer.
- [Developer guide](docs/development.md) — day-to-day backend/extension workflow.
