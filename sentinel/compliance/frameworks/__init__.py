from .base import BaseFramework as ComplianceFramework, ComplianceResult
ComplianceControl = ComplianceFramework
from .eu_ai_act import EUAIActFramework
from .gdpr import GDPRFramework
from .hipaa import HIPAAFramework
from .iso42001 import ISO42001Framework
from .nist_ai_rmf import NISTAIRMFFramework
from .owasp_llm import OWASPLLMFramework
from .soc2 import SOC2Framework

ALL_FRAMEWORKS = [
    EUAIActFramework,
    GDPRFramework,
    HIPAAFramework,
    ISO42001Framework,
    NISTAIRMFFramework,
    OWASPLLMFramework,
    SOC2Framework,
]

FRAMEWORK_MAP = {
    fw.framework_id if hasattr(fw,'framework_id') else fw.__name__: fw
    for fw in ALL_FRAMEWORKS
}

__all__ = [
    'ComplianceFramework','ComplianceControl','ComplianceResult',
    'EUAIActFramework','GDPRFramework','HIPAAFramework',
    'ISO42001Framework','NISTAIRMFFramework','OWASPLLMFramework','SOC2Framework',
    'ALL_FRAMEWORKS','FRAMEWORK_MAP',
]
FRAMEWORK_REGISTRY = FRAMEWORK_MAP
