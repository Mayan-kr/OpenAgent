from fastapi import APIRouter

from app.services.extension_bridge import extension_bridge

router = APIRouter(tags=["system"])

TOOL_CATALOG = [
    {"name": "browser.get_current_page", "safety": "read_only"},
    {"name": "browser.get_dom_snapshot", "safety": "read_only"},
    {"name": "browser.request_action", "safety": "requires_user_approval"},
]


@router.get("/health")
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": "openagent-backend",
        "extensionConnections": extension_bridge.connection_count,
    }


@router.get("/v1/mcp/tools")
async def mcp_tools() -> dict[str, object]:
    """Discovery endpoint for UIs; the authoritative executable contract remains MCP."""
    return {"tools": TOOL_CATALOG}
