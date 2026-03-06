from .eu_ai_act import EUAIActFramework
from .iso_42001 import ISO42001Framework
from .nist_ai_rmf import NISTAIRMFFramework
from .gdpr import GDPRFramework
from .china_ai_regs import ChinaAIRegsFramework
from .oecd_principles import OECDPrinciplesFramework
from .ieee_7000 import IEEE7000Framework

ALL_FRAMEWORKS = [
    EUAIActFramework(),
    GDPRFramework(),
    ChinaAIRegsFramework(),
    ISO42001Framework(),
    NISTAIRMFFramework(),
    OECDPrinciplesFramework(),
    IEEE7000Framework(),
]

__all__ = [
    "EUAIActFramework","ISO42001Framework","NISTAIRMFFramework",
    "GDPRFramework","ChinaAIRegsFramework","OECDPrinciplesFramework",
    "IEEE7000Framework","ALL_FRAMEWORKS",
]
