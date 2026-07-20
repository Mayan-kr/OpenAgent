from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.providers.openai_compatible import ProviderRequestFailed
from app.providers.registry import ProviderUnavailable
from app.routers import chat, dom, extension, health, providers

settings = get_settings()
app = FastAPI(title="OpenAgent Gateway", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"chrome-extension://[a-z]{32}",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["content-type"],
)
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(dom.router)
app.include_router(extension.router)
app.include_router(providers.router)


@app.exception_handler(ProviderUnavailable)
@app.exception_handler(ProviderRequestFailed)
async def _provider_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": str(exc)})
