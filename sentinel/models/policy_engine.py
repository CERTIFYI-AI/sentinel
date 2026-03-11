# Policy Template Engine - Certifyi Sentinel
# Handles 70+ templates across 11 compliance frameworks
import uuid, json
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict

class PolicyStatus(str, Enum):
    DRAFT = 'draft'
    PENDING_REVIEW = 'pending_review'
    PENDING_APPROVAL = 'pending_approval'
    APPROVED = 'approved'
    PUBLISHED = 'published'
    ARCHIVED = 'archived'
    EXPIRED = 'expired'
    REJECTED = 'rejected'

class Framework(str, Enum):
    SOC2 = 'SOC2'
    ISO27001 = 'ISO27001'
    GDPR = 'GDPR'
    HIPAA = 'HIPAA'
    NIST_CSF = 'NIST-CSF'
    NIST_800_53 = 'NIST-800-53'
    PCI_DSS = 'PCI-DSS'
    EU_AI_ACT = 'EU-AI-Act'
    ISO42001 = 'ISO42001'
    CCPA = 'CCPA'
    FEDRAMP = 'FedRAMP'

class RiskLevel(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'

@dataclass
class PolicyTemplate:
    id: str
    name: str
    slug: str
    description: str
    framework: str
    category: str
    content_markdown: str
    version: str = '1.0.0'
    risk_level: str = 'medium'
    review_frequency_days: int = 365
    required_approvers: int = 1
    tags: List[str] = field(default_factory=list)
    controls: List[str] = field(default_factory=list)
    is_mandatory: bool = False

@dataclass
class PolicyVersion:
    id: str
    policy_id: str
    version_number: str
    content: str
    change_summary: str
    created_by: str
    status: str = 'draft'

@dataclass
class PolicyApproval:
    id: str
    policy_id: str
    version_id: str
    approver_id: str
    status: str = 'pending'
    comments: str = ''

class PolicyEngine:
    VALID_TRANSITIONS = {
        PolicyStatus.DRAFT: [PolicyStatus.PENDING_REVIEW, PolicyStatus.ARCHIVED],
        PolicyStatus.PENDING_REVIEW: [PolicyStatus.PENDING_APPROVAL, PolicyStatus.DRAFT, PolicyStatus.REJECTED],
        PolicyStatus.PENDING_APPROVAL: [PolicyStatus.APPROVED, PolicyStatus.DRAFT, PolicyStatus.REJECTED],
        PolicyStatus.APPROVED: [PolicyStatus.PUBLISHED, PolicyStatus.DRAFT],
        PolicyStatus.PUBLISHED: [PolicyStatus.ARCHIVED, PolicyStatus.DRAFT],
        PolicyStatus.ARCHIVED: [PolicyStatus.DRAFT],
        PolicyStatus.EXPIRED: [PolicyStatus.DRAFT],
        PolicyStatus.REJECTED: [PolicyStatus.DRAFT],
    }

    def __init__(self, db_pool=None):
        self.db = db_pool

    def can_transition(self, current, target):
        try:
            return PolicyStatus(target) in self.VALID_TRANSITIONS.get(PolicyStatus(current), [])
        except ValueError:
            return False

    def transition_policy(self, policy_id, current_status, new_status, user_id):
        if not self.can_transition(current_status, new_status):
            raise ValueError(f'Invalid transition: {current_status} -> {new_status}')
        return {'policy_id': policy_id, 'old_status': current_status, 'new_status': new_status, 'transitioned_by': user_id, 'transitioned_at': datetime.utcnow().isoformat()}

    def create_version(self, policy_id, content, change_summary, user_id):
        return PolicyVersion(id=str(uuid.uuid4()), policy_id=policy_id, version_number='1.0.0', content=content, change_summary=change_summary, created_by=user_id)

    def calculate_compliance_score(self, tenant_id, framework, policies):
        if not policies:
            return {'framework': framework, 'score': 0, 'total': 0, 'compliant': 0, 'gaps': []}
        compliant = sum(1 for p in policies if p.get('status') == 'published')
        total = len(policies)
        score = round((compliant / total) * 100, 1) if total > 0 else 0
        gaps = [p['name'] for p in policies if p.get('status') != 'published']
        return {'framework': framework, 'score': score, 'total': total, 'compliant': compliant, 'gaps': gaps}

    def check_expiring_policies(self, policies, days_ahead=30):
        cutoff = (datetime.utcnow() + timedelta(days=days_ahead)).isoformat()
        return [p for p in policies if p.get('next_review_date', '') <= cutoff and p.get('status') == 'published']

    def generate_policy_from_template(self, template, tenant_id, customizations=None):
        content = template.content_markdown
        if customizations:
            for key, val in customizations.items():
                content = content.replace('{{' + key + '}}', str(val))
        return {'id': str(uuid.uuid4()), 'tenant_id': tenant_id, 'template_id': template.id, 'name': template.name, 'framework': template.framework, 'category': template.category, 'content': content, 'version': '1.0.0', 'status': 'draft', 'risk_level': template.risk_level, 'tags': template.tags, 'controls': template.controls}

    def get_framework_summary(self, policies):
        summary = {}
        for p in policies:
            fw = p.get('framework', 'Unknown')
            if fw not in summary:
                summary[fw] = {'total': 0, 'published': 0, 'draft': 0, 'pending': 0}
            summary[fw]['total'] += 1
            st = p.get('status', '')
            if st == 'published': summary[fw]['published'] += 1
            elif st == 'draft': summary[fw]['draft'] += 1
            elif 'pending' in st: summary[fw]['pending'] += 1
        return summary
