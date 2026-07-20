"""The primary agent interface: standards-compliant MCP over stdio."""

from mcp.server.fastmcp import FastMCP

from app.schemas import ActionRequest
from app.services.consent import requires_explicit_confirmation
from app.services.page_context import page_context_store

mcp = FastMCP("OpenAgent")


@mcp.tool(name="browser.get_current_page")
def get_current_page() -> dict[str, object]:
    """Return the latest user-authorized, compressed browser page context."""
    page = page_context_store.latest()
    if page is None:
        return {"available": False, "message": "No page context has been shared by the extension."}
    return {"available": True, "page": page.model_dump(mode="json", by_alias=True)}


@mcp.tool(name="browser.get_dom_snapshot")
def get_dom_snapshot() -> dict[str, object]:
    """Return only the compressed semantic DOM from the latest shared page."""
    page = page_context_store.latest()
    if page is None or page.dom is None:
        return {"available": False, "message": "No DOM snapshot has been shared by the extension."}
    return {"available": True, "dom": page.dom.model_dump(mode="json", by_alias=True)}


@mcp.tool(name="browser.request_action")
def request_browser_action(
    action: str, reason: str, target: str | None = None
) -> dict[str, object]:
    """Create a browser-action consent request. This server never executes a mutation directly."""
    request = ActionRequest(action=action, reason=reason, target=target)
    return {
        "status": "approval_required",
        "request": request.model_dump(),
        "explicitConfirmationRequired": requires_explicit_confirmation(request),
    }


if __name__ == "__main__":
    mcp.run(transport="stdio")
