
from __future__ import annotations
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS: Dict[str, float] = {
    "compliance": 0.30,
    "bias_fairness": 0.25,
    "performance": 0.25,
    "security": 0.20,
}

@dataclass
class TrustSignal:
    name: str
    score: float          # 0.0 - 100.0
    weight: float         # 0.0 - 1.0
    confidence: float = 1.0
    notes: str = ""
    details: Dict[str, Any] = field(default_factory=dict)

    @property
    def weighted(self) -> float:
        return round(self.weight * self.score, 4)

@dataclass
class TrustResult:
    overall_score: float
    grade: str
    label: str
    signals: Dict[str, TrustSignal] = field(default_factory=dict)
    model_id: Optional[str] = None
    tenant_id: Optional[str] = None
    computed_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    recommendations: List[str] = field(default_factory=list)

    @property
    def is_trusted(self) -> bool:
        return self.overall_score >= 70.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_score": self.overall_score,
            "grade": self.grade,
            "label": self.label,
            "is_trusted": self.is_trusted,
            "signals": {k: {"score": v.score, "weight": v.weight, "weighted": v.weighted, "confidence": v.confidence, "notes": v.notes} for k, v in self.signals.items()},
            "model_id": self.model_id,
            "tenant_id": self.tenant_id,
            "computed_at": self.computed_at,
            "recommendations": self.recommendations,
        }

def _grade(score: float) -> tuple:
    if score >= 90: return ("A", "Highly Trusted")
    if score >= 80: return ("B", "Trusted")
    if score >= 70: return ("C", "Provisionally Trusted")
    if score >= 60: return ("D", "Low Trust - Review Required")
    return ("F", "Untrusted - Immediate Action Required")

def _clamp(v: float) -> float:
    return min(max(float(v or 0), 0.0), 100.0)

def _recommendations(signals: Dict[str, TrustSignal]) -> List[str]:
    recs = []
    thresholds = {"compliance": 75, "bias_fairness": 70, "performance": 70, "security": 80}
    messages = {
        "compliance": "Review compliance controls and run a full framework assessment.",
        "bias_fairness": "Conduct a bias audit across protected attributes and demographic groups.",
        "performance": "Investigate latency spikes, error rates, and model drift indicators.",
        "security": "Run a security assessment including prompt injection and data leakage tests.",
    }
    for k, sig in signals.items():
        if sig.score < thresholds.get(k, 70):
            recs.append(messages.get(k, f"Improve {k} score (currently {sig.score:.1f})."))
    return recs

class TrustEngine:
    """Computes weighted trust score (0-100) across compliance, bias, performance, security."""

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or dict(DEFAULT_WEIGHTS)
        total = sum(self.weights.values())
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"Trust weights must sum to 1.0, got {total:.4f}")

    def compute(
        self,
        compliance_score: float = 0.0,
        bias_fairness_score: float = 0.0,
        performance_score: float = 0.0,
        security_score: float = 0.0,
        model_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        notes: Optional[Dict[str, str]] = None,
    ) -> TrustResult:
        notes = notes or {}
        raw = {
            "compliance": _clamp(compliance_score),
            "bias_fairness": _clamp(bias_fairness_score),
            "performance": _clamp(performance_score),
            "security": _clamp(security_score),
        }
        signals = {k: TrustSignal(name=k, score=raw[k], weight=self.weights[k], notes=notes.get(k, "")) for k in self.weights}
        overall = round(sum(s.weighted for s in signals.values()), 2)
        grade, label = _grade(overall)
        result = TrustResult(
            overall_score=overall, grade=grade, label=label,
            signals=signals, model_id=model_id, tenant_id=tenant_id,
            recommendations=_recommendations(signals),
        )
        logger.info("TrustEngine: %.2f (%s) model=%s tenant=%s", overall, grade, model_id, tenant_id)
        return result

    def compute_from_dict(self, scores: Dict[str, float], **kwargs) -> TrustResult:
        return self.compute(
            compliance_score=scores.get("compliance", 0),
            bias_fairness_score=scores.get("bias_fairness", 0),
            performance_score=scores.get("performance", 0),
            security_score=scores.get("security", 0),
            **kwargs,
        )

def compute_trust_score(compliance=0, bias_fairness=0, performance=0, security=0, weights=None) -> float:
    return TrustEngine(weights=weights).compute(compliance, bias_fairness, performance, security).overall_score
