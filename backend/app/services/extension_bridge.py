import asyncio

from fastapi import WebSocket


class ExtensionBridge:
    """Maintains optional extension connections without treating the browser as trusted."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, socket: WebSocket) -> None:
        await socket.accept()
        async with self._lock:
            self._connections.add(socket)

    async def disconnect(self, socket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(socket)

    @property
    def connection_count(self) -> int:
        return len(self._connections)


extension_bridge = ExtensionBridge()
