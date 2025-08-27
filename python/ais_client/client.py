from __future__ import annotations

import os
import json
from dataclasses import dataclass
from typing import Any, Dict, Optional, List, Literal
import requests

ImmuneDecision = Literal["ACCEPT", "ACCEPT_WITH_REPAIRS", "QUARANTINE", "REJECT"]


@dataclass
class ImmuneRunResult:
    decision: ImmuneDecision
    repairs: List[str]
    final: Optional[Dict[str, Any]]
    cid: Optional[str]
    trace_id: Optional[str]
    diagnostics: List[Dict[str, Any]]
    raw: Dict[str, Any]

    @property
    def ok(self) -> bool:
        return self.decision in ("ACCEPT", "ACCEPT_WITH_REPAIRS")


class AISClient:
    """Python client for AIS API.

    Args:
        api_key: Tenant API key.
        base_url: Base server URL (default http://localhost:8088).
        timeout: Seconds for request timeout.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, timeout: float = 15.0):
        self.api_key = api_key or os.getenv("AIS_API_KEY") or ""
        self.base_url = (base_url or os.getenv("AIS_BASE_URL") or "http://localhost:8088").rstrip("/")
        self.timeout = timeout
        if not self.api_key:
            raise ValueError("api_key required (or set AIS_API_KEY env var)")

    # Low-level POST helper
    def _post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
        }
        resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=self.timeout)
        if resp.status_code >= 400:
            raise RuntimeError(f"AIS API error {resp.status_code}: {resp.text}")
        return resp.json()

    def run(
        self,
        json: Any,
        schema: Optional[Dict[str, Any]] = None,
        options: Optional[Dict[str, Any]] = None,
        forward_url: Optional[str] = None,
    ) -> ImmuneRunResult:
        payload: Dict[str, Any] = {"json": json}
        if schema is not None:
            payload["schema"] = schema
        if options:
            payload["options"] = options
        if forward_url:
            payload["forward_url"] = forward_url
        data = self._post("/v1/immune/run", payload)
        return ImmuneRunResult(
            decision=data.get("decision"),
            repairs=data.get("repairs", []),
            final=data.get("final"),
            cid=data.get("cid"),
            trace_id=data.get("trace_id"),
            diagnostics=data.get("diagnostics", []),
            raw=data,
        )
