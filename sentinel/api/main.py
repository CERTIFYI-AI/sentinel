"""Sentinel AI Compliance Platform - Main FastAPI Application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Sentinel API starting up...")
    # Start cross-module event consumer
    try:
        from sentinel.api.event_listeners import handle_event, register_listeners
        from sentinel.events.bus import bus
        _listener_q = register_listeners()
        async def _event_consumer():
            while True:
                try:
                    event = await _listener_q.get()
                    await handle_event(event)
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Event consumer error: {e}")
        _consumer_task = asyncio.create_task(_event_consumer())
        logger.info("Cross-module event consumer started")
    except Exception as e:
        _consumer_task = None
        logger.warning(f"Event consumer not started: {e}")
    yield
    if _consumer_task:
        _consumer_task.cancel()
    logger.info("Sentinel API shutting down...")


app = FastAPI(
    title="Sentinel AI Compliance Platform",
    description="Enterprise AI Governance & Compliance Platform with real-time cross-module propagation",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Auth ----
try:
    from sentinel.api.auth_router import router as auth_router
    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    logger.info("auth_router loaded")
except Exception as e:
    logger.warning(f"auth_router failed: {e}")

# ---- Policies ----
try:
    from sentinel.api.policy_router import router as policy_router
    app.include_router(policy_router, prefix="/api/policies", tags=["policies"])
    logger.info("policy_router loaded")
except Exception as e:
    logger.warning(f"policy_router failed: {e}")

# ---- Agents ----
try:
    from sentinel.api.agent_router import router as agent_router
    app.include_router(agent_router, prefix="/api/agents", tags=["agents"])
    logger.info("agent_router loaded")
except Exception as e:
    logger.warning(f"agent_router failed: {e}")

# ---- Models ----
try:
    from sentinel.api.model_router import router as model_router
    app.include_router(model_router, prefix="/api/models", tags=["models"])
    logger.info("model_router loaded")
except Exception as e:
    logger.warning(f"model_router failed: {e}")

# ---- Vendors ----
try:
    from sentinel.api.vendor_router import router as vendor_router
    app.include_router(vendor_router, prefix="/api/vendors", tags=["vendors"])
    logger.info("vendor_router loaded")
except Exception as e:
    logger.warning(f"vendor_router failed: {e}")

# ---- Controls ----
try:
    from sentinel.api.controls_router import router as controls_router
    app.include_router(controls_router, prefix="/api/controls", tags=["controls"])
    logger.info("controls_router loaded")
except Exception as e:
    logger.warning(f"controls_router failed: {e}")

# ---- Datasets ----
try:
    from sentinel.api.dataset_router import router as dataset_router
    app.include_router(dataset_router, prefix="/api/datasets", tags=["datasets"])
    logger.info("dataset_router loaded")
except Exception as e:
    logger.warning(f"dataset_router failed: {e}")

# ---- Bias Audits ----
try:
    from sentinel.api.bias_audit_router import router as bias_audit_router
    app.include_router(bias_audit_router, prefix="/api/bias-audits", tags=["bias-audits"])
    logger.info("bias_audit_router loaded")
except Exception as e:
    logger.warning(f"bias_audit_router failed: {e}")

# ---- Compliance ----
try:
    from sentinel.api.compliance_router import router as compliance_router
    app.include_router(compliance_router, prefix="/api/compliance", tags=["compliance"])
    logger.info("compliance_router loaded")
except Exception as e:
    logger.warning(f"compliance_router failed: {e}")

# ---- Evals ----
try:
    from sentinel.api.evals_router import router as evals_router
    app.include_router(evals_router, prefix="/api/evals", tags=["evals"])
    logger.info("evals_router loaded")
except Exception as e:
    logger.warning(f"evals_router failed: {e}")

# ---- Security ----
try:
    from sentinel.api.security_router import router as security_router
    app.include_router(security_router, prefix="/api/security", tags=["security"])
    logger.info("security_router loaded")
except Exception as e:
    logger.warning(f"security_router failed: {e}")

# ---- CISO Dashboard ----
try:
    from sentinel.api.ciso_router import router as ciso_router
    app.include_router(ciso_router, prefix="/api/ciso", tags=["ciso"])
    logger.info("ciso_router loaded")
except Exception as e:
    logger.warning(f"ciso_router failed: {e}")

# ---- Dashboard ----
try:
    from sentinel.api.dashboard_router import router as dashboard_router
    app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
    logger.info("dashboard_router loaded")
except Exception as e:
    logger.warning(f"dashboard_router failed: {e}")

# ---- Events (WebSocket + SSE) ----
try:
    from sentinel.api.events_router import router as events_router
    app.include_router(events_router, prefix="/api/events", tags=["events"])
    logger.info("events_router loaded")
except Exception as e:
    logger.warning(f"events_router failed: {e}")

# ---- Notifications ----
try:
    from sentinel.api.notifications_router import router as notifications_router
    app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
    logger.info("notifications_router loaded")
except Exception as e:
    logger.warning(f"notifications_router failed: {e}")

# ---- Audit Logs ----
try:
    from sentinel.api.audit_log_router import router as audit_log_router
    app.include_router(audit_log_router, prefix="/api/audit-logs", tags=["audit-logs"])
    logger.info("audit_log_router loaded")
except Exception as e:
    logger.warning(f"audit_log_router failed: {e}")

# ---- Tasks ----
try:
    from sentinel.api.tasks_router import router as tasks_router
    app.include_router(tasks_router, prefix="/api/tasks", tags=["tasks"])
    logger.info("tasks_router loaded")
except Exception as e:
    logger.warning(f"tasks_router failed: {e}")

# ---- Approvals ----
try:
    from sentinel.api.approval_router import router as approval_router
    app.include_router(approval_router, prefix="/api/approvals", tags=["approvals"])
    logger.info("approval_router loaded")
except Exception as e:
    logger.warning(f"approval_router failed: {e}")

# ---- Health ----
try:
    from sentinel.api.health_router import router as health_router
    app.include_router(health_router, prefix="/api/health", tags=["health"])
    logger.info("health_router loaded")
except Exception as e:
    logger.warning(f"health_router failed: {e}")


@app.get("/", tags=["root"])
async def root():
    """Platform root - returns status."""
    return {
        "message": "Sentinel AI Compliance Platform",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/api/docs",
    }


@app.get("/api", tags=["root"])
async def api_info():
    """API info endpoint."""
    routes = [
        {"path": r.path, "methods": sorted(r.methods) if hasattr(r, "methods") and r.methods else []}
        for r in app.routes
        if hasattr(r, "path")
    ]
    return {"total_routes": len(routes), "routes": routes}

try:
    from sentinel.api import trust_engine_router
    app.include_router(trust_engine_router.router, prefix="/api/trust-engine", tags=["trust-engine"])
    logger.info('trust_engine_router loaded')
except Exception as e:
    logger.warning(f'trust_engine_router error: {e}')

try:
    from sentinel.api import rbac_router
    app.include_router(rbac_router.router, prefix="/api/rbac", tags=["rbac"])
    logger.info('rbac_router loaded')
except Exception as e:
    logger.warning(f'rbac_router error: {e}')

try:
    from sentinel.api import shadow_ai_router
    app.include_router(shadow_ai_router.router, prefix="/api/shadow-ai", tags=["shadow-ai"])
    logger.info('shadow_ai_router loaded')
except Exception as e:
    logger.warning(f'shadow_ai_router error: {e}')

try:
    from sentinel.api import reg_radar_router
    app.include_router(reg_radar_router.router, prefix="/api/reg-radar", tags=["reg-radar"])
    logger.info('reg_radar_router loaded')
except Exception as e:
    logger.warning(f'reg_radar_router error: {e}')

try:
    from sentinel.api import observability_router
    app.include_router(observability_router.router, prefix="/api/observability", tags=["observability"])
    logger.info('observability_router loaded')
except Exception as e:
    logger.warning(f'observability_router error: {e}')

try:
    from sentinel.api import questionnaire_router
    app.include_router(questionnaire_router.router, prefix="/api/questionnaires", tags=["questionnaires"])
    logger.info('questionnaire_router loaded')
except Exception as e:
    logger.warning(f'questionnaire_router error: {e}')
