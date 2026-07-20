from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.schemas import ExtensionHello
from app.services.extension_bridge import extension_bridge

router = APIRouter(tags=["extension"])


@router.websocket("/ws/extension")
async def extension_socket(socket: WebSocket) -> None:
    await extension_bridge.connect(socket)
    try:
        hello = ExtensionHello.model_validate(await socket.receive_json())
        await socket.send_json({"type": "ready", "extensionId": hello.extension_id})
        while True:
            await socket.receive_json()
    except (WebSocketDisconnect, ValidationError):
        return
    finally:
        await extension_bridge.disconnect(socket)
