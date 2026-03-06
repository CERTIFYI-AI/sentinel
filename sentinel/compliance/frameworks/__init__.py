from .base import ComplianceFramework, ComplianceControl, ComplianceResult
from .eu_ai_act import EUAIActFramework
from .gdpr import GDPRFramework
from .hipaa import HIPAAFramework
from .iso27001 import ISO27001Framework
from .nist_ai_rmf import NISTAIRMFFramework
from .owasp_llm import OWASPLLMFramework
from .soc2 import SOC2Framework

ALL_FRAMEWORKS = [
    EUAIActFramework,
    GDPRFramework,
    HIPAAFramework,
    ISO27001Framework,
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
    'ISO27001Framework','NISTAIRMFFramework','OWASPLLMFramework','SOC2Framework',
    'ALL_FRAMEWORKS','FRAMEWORK_MAP',
]
