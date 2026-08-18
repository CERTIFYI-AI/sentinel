# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Agent tool-call enforcement: the runtime behind the MCP gateway's policy."""

from sentinel.gateway.policy import (  # noqa: F401
    Decision,
    ToolPolicy,
    evaluate,
)
