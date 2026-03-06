from __future__ import annotations
import json
import os
from typing import Any

_DEFAULT_CFG_PATH = os.path.join(os.path.dirname(__file__), 'default.json')

def load_default_config() -> dict:
    with open(_DEFAULT_CFG_PATH) as f:
        return json.load(f)


class FrameworkConfig:
    def __init__(self, tenant_id: str, overrides: dict | None = None):
        self.tenant_id = tenant_id
        self._cfg = load_default_config()
        if overrides:
            for fw, vals in overrides.items():
                if fw in self._cfg:
                    self._cfg[fw].update(vals)
                else:
                    self._cfg[fw] = vals

    def is_enabled(self, framework_id: str) -> bool:
        return self._cfg.get(framework_id, {}).get('enabled', True)

    def get_threshold(self, framework_id: str, key: str, default: Any = None) -> Any:
        return self._cfg.get(framework_id, {}).get('thresholds', {}).get(key, default)

    def enabled_frameworks(self) -> list[str]:
        return [fid for fid, cfg in self._cfg.items() if cfg.get('enabled', True)]
