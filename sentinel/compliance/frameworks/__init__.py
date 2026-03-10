"""Compliance frameworks package."""
from sentinel.compliance.frameworks.base import (
    BaseFramework,
    Control,
    ControlStatus,
    EvidenceRecord,
    FrameworkMetadata,
    FrameworkStatus,
)
from sentinel.compliance.frameworks.eu_ai_act import EUAIActFramework
from sentinel.compliance.frameworks.iso42001 import ISO42001Framework
from sentinel.compliance.frameworks.nist_ai_rmf import NISTAIRMFFramework
from sentinel.compliance.frameworks.gdpr import GDPRFramework
from sentinel.compliance.frameworks.china_ai_regs import ChinaAIRegsFramework
from sentinel.compliance.frameworks.oecd_principles import OECDPrinciplesFramework
from sentinel.compliance.frameworks.ieee7000 import IEEE7000Framework
from sentinel.compliance.frameworks.hipaa import HIPAAFramework
from sentinel.compliance.frameworks.iso27001 import ISO27001Framework
from sentinel.compliance.frameworks.owasp_llm import OWASPLLMFramework
from sentinel.compliance.frameworks.soc2 import SOC2Framework
from sentinel.compliance.frameworks.owasp_agentic import OWASPAgenticFramework
from sentinel.compliance.frameworks.owasp_api import OWASPAPIFramework
from sentinel.compliance.frameworks.mitre_atlas import MITREATLASFramework
from sentinel.compliance.frameworks.dod_ai import DoDAlFramework

FRAMEWORK_REGISTRY: dict[str, BaseFramework] = {
    "eu_ai_act": EUAIActFramework(),
    "iso42001": ISO42001Framework(),
    "nist_ai_rmf": NISTAIRMFFramework(),
    "gdpr": GDPRFramework(),
    "china_ai_regs": ChinaAIRegsFramework(),
    "oecd_principles": OECDPrinciplesFramework(),
    "ieee7000": IEEE7000Framework(),
    "hipaa": HIPAAFramework(),
    "iso27001": ISO27001Framework(),
    "owasp_llm": OWASPLLMFramework(),
    "soc2": SOC2Framework(),
    "owasp_agentic": OWASPAgenticFramework(),
    "owasp_api": OWASPAPIFramework(),
    "mitre_atlas": MITREATLASFramework(),
    "dod_ai": DoDAlFramework(),
}

ALL_FRAMEWORKS = [
    EUAIActFramework,
    ISO42001Framework,
    NISTAIRMFFramework,
    GDPRFramework,
    ChinaAIRegsFramework,
    OECDPrinciplesFramework,
    IEEE7000Framework,
    HIPAAFramework,
    ISO27001Framework,
    OWASPLLMFramework,
    SOC2Framework,
    OWASPAgenticFramework,
    OWASPAPIFramework,
    MITREATLASFramework,
    DoDAlFramework,
]

__all__ = [
    "BaseFramework", "Control", "ControlStatus", "EvidenceRecord",
    "FrameworkMetadata", "FrameworkStatus", "FRAMEWORK_REGISTRY",
    "ALL_FRAMEWORKS",
    "EUAIActFramework", "ISO42001Framework", "NISTAIRMFFramework",
    "GDPRFramework", "ChinaAIRegsFramework", "OECDPrinciplesFramework",
    "IEEE7000Framework",
    "HIPAAFramework", "ISO27001Framework", "OWASPLLMFramework",
    "SOC2Framework",
    "OWASPAgenticFramework", "OWASPAPIFramework", "MITREATLASFramework",
    "DoDAlFramework",
]
