"""Cross-module event emission helpers."""
import logging
from typing import Any

logger = logging.getLogger(__name__)

try:
    from sentinel.events.bus import bus as _bus, SentinelEvent, EventType
    _has_bus = True
except Exception:
    _bus = None
    _has_bus = False
    logger.warning("EventBus not available for event_helpers")

async def emit(event_type, source_module: str, tenant_id: str = "default", payload: dict[str, Any] = None):
    """Fire-and-forget event emission. Never raises."""
    if not _has_bus or _bus is None:
        return
    try:
        evt = SentinelEvent(
            type=event_type if isinstance(event_type, EventType) else EventType(event_type),
            source_module=source_module,
            tenant_id=tenant_id,
            payload=payload or {},
        )
        await _bus.publish(evt)
        logger.debug(f"Event emitted: {event_type} from {source_module}")
    except Exception as e:
        logger.warning(f"Failed to emit event {event_type}: {e}")
