from app.schemas import ChatRequest, ChatResponse
from app.providers.base import GenerationRequest
from app.providers.byok import build_ephemeral_provider
from app.providers.registry import provider_registry
from app.services.page_context import page_context_store


class ChatService:
    """Thin orchestration seam; later provider and LangGraph services plug in here."""

    def reply(self, request: ChatRequest) -> ChatResponse:
        page_context_store.save(request.page)
        if request.provider is not None:
            generation = build_ephemeral_provider(request.provider).generate(
                GenerationRequest(prompt=request.message, model=request.provider.model)
            )
        else:
            generation = provider_registry.generate(
                GenerationRequest(prompt=request.message, model=provider_registry.model_name())
            )
        return ChatResponse(
            message=(
                f"{generation.content} I received the read-only context for '{request.page.title}'. "
                "The MCP capability host is connected."
            ),
            toolHints=["browser.get_current_page", "browser.get_dom_snapshot"],
        )


chat_service = ChatService()
