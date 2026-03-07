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

FRAMEWORK_REGISTRY: dict[str, BaseFramework] = {
    "eu_ai_act": EUAIActFramework(),
    "iso42001": ISO42001Framework(),
    "nist_ai_rmf": NISTAIRMFFramework(),
    "gdpr": GDPRFramework(),
    "china_ai_regs": ChinaAIRegsFramework(),
    "oecd_principles": OECDPrinciplesFramework(),
    "ieee7000": IEEE7000Framework(),
}

__all__ = [
    "BaseFramework", "Control", "ControlStatus", "EvidenceRecord",
    "FrameworkMetadata", "FrameworkStatus", "FRAMEWORK_REGISTRY",
    "EUAIActFramework", "ISO42001Framework", "NISTAIRMFFramework",
    "GDPRFramework", "ChinaAIRegsFramework", "OECDPrinciplesFramework",
    "IEEE7000Framework",
]
