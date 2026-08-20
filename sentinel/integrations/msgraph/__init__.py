# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Shared Microsoft Graph client for the Graph-family adapters."""

from sentinel.integrations.msgraph.client import CLOUDS, GraphClient, GraphCredentials

__all__ = ["CLOUDS", "GraphClient", "GraphCredentials"]
