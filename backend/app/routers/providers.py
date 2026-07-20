from fastapi import APIRouter

from app.providers.registry import provider_registry

router = APIRouter(prefix="/v1/providers", tags=["providers"])


@router.get("")
async def providers() -> dict[str, object]:
    return {
        "active": provider_registry.active_name(),
        "providers": [
            {
                "name": descriptor.name,
                "displayName": descriptor.display_name,
                "configured": descriptor.configured,
                "capabilities": list(descriptor.capabilities),
            }
            for descriptor in provider_registry.descriptors()
        ],
    }
