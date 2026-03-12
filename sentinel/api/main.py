# main.py - Add router imports here

# Sentinel API routers to include in main.py
# Add these imports and router includes:

from sentinel.api.routers import (
    model_router, controls_router, dataset_router,
    agent_router, vendor_router, bias_audit_router,
    evidence_router, hitl_router
)

# In the FastAPI app setup, include:
# app.include_router(model_router.router, prefix="/api", tags=["models"])
# app.include_router(controls_router.router, prefix="/api", tags=["controls"])
# app.include_router(dataset_router.router, prefix="/api", tags=["datasets"])
# app.include_router(agent_router.router, prefix="/api", tags=["agents"])
# app.include_router(vendor_router.router, prefix="/api", tags=["vendors"])
# app.include_router(bias_audit_router.router, prefix="/api", tags=["bias-audits"])
# app.include_router(evidence_router.router, prefix="/api", tags=["evidence"])
# app.include_router(hitl_router.router, prefix="/api", tags=["hitl"])
