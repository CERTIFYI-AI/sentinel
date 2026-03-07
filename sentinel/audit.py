"""
Backwards-compatibility shim.
All real logic lives in sentinel/layers/auditor.py.
This module delegates to it so that any code importing from sentinel.audit
continues to work.
"""
from sentinel.layers.auditor import (
    log as log_entry,
    verify_chain_integrity as verify_chain,
)

__all__ = ["log_entry", "verify_chain"]
