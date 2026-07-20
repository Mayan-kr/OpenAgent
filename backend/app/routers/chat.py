from fastapi import APIRouter

from app.schemas import ChatRequest, ChatResponse
from app.services.chat import chat_service

router = APIRouter(prefix="/v1", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    return chat_service.reply(request)
