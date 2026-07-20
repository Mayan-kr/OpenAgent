from fastapi import APIRouter, HTTPException

from app.schemas import ChatRequest, DomAnalyzeResponse
from app.services.dom_analysis import dom_analysis_service
from app.services.page_context import page_context_store

router = APIRouter(prefix="/v1/dom", tags=["dom"])


@router.post("/analyze", response_model=DomAnalyzeResponse)
async def analyze_dom(request: ChatRequest) -> DomAnalyzeResponse:
    """Analyze structure only; the message is accepted for a consistent page-upload contract."""
    page_context_store.save(request.page)
    return dom_analysis_service.analyze(request.page)


@router.get("/current", response_model=DomAnalyzeResponse)
async def analyze_current_dom() -> DomAnalyzeResponse:
    page = page_context_store.latest()
    if page is None:
        raise HTTPException(status_code=404, detail="No page context has been shared yet.")
    return dom_analysis_service.analyze(page)
