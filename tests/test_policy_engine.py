import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from sentinel.models.policy_engine import PolicyEngine, PolicyStatus, Framework, RiskLevel, PolicyTemplate

@pytest.fixture
def engine():
    return PolicyEngine()

class TestPolicyStatus:
    def test_all_statuses_defined(self):
        assert len(PolicyStatus) == 8
        assert PolicyStatus.DRAFT.value == 'draft'
        assert PolicyStatus.PUBLISHED.value == 'published'

class TestFramework:
    def test_all_frameworks_defined(self):
        assert len(Framework) == 11
        assert Framework.SOC2.value == 'soc2'
        assert Framework.EU_AI_ACT.value == 'eu_ai_act'

class TestPolicyEngine:
    def test_valid_transition(self, engine):
        assert engine.can_transition('draft', 'pending_review') is True
        assert engine.can_transition('draft', 'published') is False
        assert engine.can_transition('published', 'archived') is True

    def test_invalid_transition(self, engine):
        assert engine.can_transition('draft', 'approved') is False
        assert engine.can_transition('archived', 'published') is False

    def test_transition_policy(self, engine):
        result = engine.transition_policy('p1', 'draft', 'pending_review', 'user1')
        assert result['policy_id'] == 'p1'
        assert result['new_status'] == 'pending_review'

    def test_invalid_transition_raises(self, engine):
        with pytest.raises(ValueError):
            engine.transition_policy('p1', 'draft', 'published', 'user1')

    def test_compliance_score_empty(self, engine):
        result = engine.calculate_compliance_score('t1', 'SOC2', [])
        assert result['score'] == 0
        assert result['total'] == 0

    def test_compliance_score_calculation(self, engine):
        policies = [
            {'name': 'P1', 'status': 'published'},
            {'name': 'P2', 'status': 'published'},
            {'name': 'P3', 'status': 'draft'},
        ]
        result = engine.calculate_compliance_score('t1', 'SOC2', policies)
        assert result['score'] == 66.7
        assert result['compliant'] == 2
        assert result['gaps'] == ['P3']

    def test_framework_summary(self, engine):
        policies = [
            {'framework': 'SOC2', 'status': 'published'},
            {'framework': 'SOC2', 'status': 'draft'},
            {'framework': 'GDPR', 'status': 'pending_review'},
        ]
        summary = engine.get_framework_summary(policies)
        assert summary['SOC2']['total'] == 2
        assert summary['SOC2']['published'] == 1
        assert summary['GDPR']['pending'] == 1

    def test_risk_levels(self):
        assert RiskLevel.CRITICAL.value == 'critical'
        assert len(RiskLevel) == 4
