
from sentinel.events.compliance_events import ComplianceEvent

async def publish_compliance(event: ComplianceEvent, payload: dict, actor: str = "system"):
    """Helper to publish compliance events from anywhere in the app"""
    from sentinel.events.propagation import propagate
    return await propagate(event, payload, actor)
