from sentinel.compliance.frameworks.eu_ai_act import EUAIActFramework
from sentinel.compliance.frameworks.soc2 import SOC2Framework
from sentinel.compliance.frameworks.iso27001 import ISO27001Framework
from sentinel.compliance.frameworks.nist_ai_rmf import NISTAIRMFFramework
from sentinel.compliance.frameworks.gdpr import GDPRFramework
from sentinel.compliance.frameworks.hipaa import HIPAAFramework
from sentinel.compliance.frameworks.owasp_llm import OWASPLLMFramework

FRAMEWORK_REGISTRY = {
    f.framework_id: f for f in [
        EUAIActFramework(),
        SOC2Framework(),
        ISO27001Framework(),
        NISTAIRMFFramework(),
        GDPRFramework(),
        HIPAAFramework(),
        OWASPLLMFramework(),
    ]
}

__all__ = [
    "EUAIActFramework",
    "SOC2Framework",
    "ISO27001Framework",
    "NISTAIRMFFramework",
    "GDPRFramework",
    "HIPAAFramework",
    "OWASPLLMFramework",
    "FRAMEWORK_REGISTRY",
]
