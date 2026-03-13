
from __future__ import annotations
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
import logging, uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

PROTECTED_ATTRIBUTES = ["gender", "race", "age", "disability", "ethnicity", "religion", "sexual_orientation"]

@dataclass
class BiasMetric:
    attribute: str
    metric_name: str
    value: float
    threshold: float
    passed: bool
    details: str = ""

@dataclass
class FairnessReport:
    id: str
    model_id: str
    overall_fairness_score: float
    metrics: List[BiasMetric] = field(default_factory=list)
    protected_attributes_tested: List[str] = field(default_factory=list)
    issues_found: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @property
    def is_fair(self) -> bool:
        return self.overall_fairness_score >= 80.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id, "model_id": self.model_id,
            "overall_fairness_score": self.overall_fairness_score,
            "is_fair": self.is_fair,
            "metrics": [{"attribute": m.attribute, "metric": m.metric_name, "value": m.value, "threshold": m.threshold, "passed": m.passed, "details": m.details} for m in self.metrics],
            "protected_attributes_tested": self.protected_attributes_tested,
            "issues_found": self.issues_found,
            "recommendations": self.recommendations,
            "created_at": self.created_at,
        }

def run_bias_audit(
    model_id: str,
    predictions: Optional[Dict[str, List[float]]] = None,
    demographic_parity_threshold: float = 0.1,
    equalized_odds_threshold: float = 0.1,
) -> FairnessReport:
    report_id = str(uuid.uuid4())
    metrics: List[BiasMetric] = []
    issues: List[str] = []
    recs: List[str] = []
    tested_attrs: List[str] = []
    scores: List[float] = []

    if not predictions:
        return FairnessReport(id=report_id, model_id=model_id, overall_fairness_score=0.0,
            issues_found=["No prediction data provided for bias assessment."],
            recommendations=["Provide demographic-disaggregated prediction data to run a meaningful bias audit."])

    for attr, values in predictions.items():
        if attr not in PROTECTED_ATTRIBUTES:
            continue
        tested_attrs.append(attr)
        if len(values) < 2:
            continue
        mean_val = sum(values) / len(values)
        max_val = max(values)
        min_val = min(values)
        disparity = abs(max_val - min_val)
        dp_passed = disparity <= demographic_parity_threshold
        dp_score = max(0.0, 100.0 - (disparity * 500.0))
        scores.append(dp_score)
        metrics.append(BiasMetric(attribute=attr, metric_name="demographic_parity", value=round(disparity, 4),
            threshold=demographic_parity_threshold, passed=dp_passed, details=f"Disparity between groups: {disparity:.4f}"))
        if not dp_passed:
            issues.append(f"Demographic parity violation for '{attr}': disparity={disparity:.4f} > threshold={demographic_parity_threshold}")
            recs.append(f"Investigate and mitigate bias in '{attr}' predictions. Consider re-balancing training data or applying fairness constraints.")

    overall = round(sum(scores) / len(scores), 2) if scores else 0.0
    if not tested_attrs:
        issues.append("No protected attributes found in prediction data.")
        recs.append("Include data disaggregated by protected attributes (gender, race, age, etc.).")

    report = FairnessReport(id=report_id, model_id=model_id, overall_fairness_score=overall,
        metrics=metrics, protected_attributes_tested=tested_attrs, issues_found=issues, recommendations=recs)
    logger.info("Bias audit for model %s: score=%.2f, issues=%d", model_id, overall, len(issues))
    return report
