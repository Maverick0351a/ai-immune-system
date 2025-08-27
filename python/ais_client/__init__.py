"""AIS Python Client

Lightweight Python wrapper for the AI Immune System API.

Usage:
    from ais_client import AISClient
    c = AISClient(api_key="demo", base_url="http://localhost:8088")
    result = c.run(json={"amount": "42"}, schema={"type":"object","properties":{"amount":{"type":"number"}},"required":["amount"]})
    print(result.final)  # => {'amount': 42}

The client only calls the public HTTP API; no local validation is done.
"""

from .client import AISClient, ImmuneRunResult, ImmuneDecision  # noqa: F401

__all__ = ["AISClient", "ImmuneRunResult", "ImmuneDecision"]

__version__ = "0.1.0"
