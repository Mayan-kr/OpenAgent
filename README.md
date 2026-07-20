# OpenAgent

OpenAgent is a model-agnostic browser agent built around the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). The Chrome extension is a capability host; the Python backend is an MCP server and agent gateway. No browser action is performed without a user-approved capability grant.

## Implemented milestones

Milestone 1 established the extension ↔ FastAPI ↔ MCP vertical slice. Milestone 2 adds a bounded semantic DOM snapshot and a server-side provider port/registry.

This repository contains the vertical slice for local development:

- Chrome MV3 extension with a React side panel and popup
- FastAPI health and chat endpoints plus a WebSocket extension bridge
- stdio MCP server with safe, read-only browser tools
- shared JSON schemas for the browser-tool contract
- tests, Docker configuration, and development documentation
- semantic DOM analysis (`/v1/dom/analyze`)
- provider discovery (`/v1/providers`) with a deterministic local default

## Quick start

Prerequisites: Python 3.11+ and Node 20+.

```powershell
uv sync --directory backend
uv run --directory backend uvicorn app.main:app --reload --port 8000
npm install
npm run dev --workspace @openagent/extension
```

Load `extension/dist` as an unpacked extension from `chrome://extensions`. The side panel connects to `http://127.0.0.1:8000` by default.

To expose the backend to an MCP client:

```powershell
uv run --directory backend python -m app.mcp_server
```

See [architecture](docs/architecture.md) and the [developer guide](docs/development.md).
