# AIS Python Client

Lightweight Python wrapper for the AI Immune System (AIS) API.

## Install (after release)

```bash
pip install ais-client
```

## Quick Use

```python
from ais_client import AISClient

client = AISClient(api_key="YOUR_API_KEY", base_url="https://your-ais.example")
res = client.run(
    json={"amount": "42"},
    schema={"type": "object", "properties": {"amount": {"type": "number"}}, "required": ["amount"]},
)
print(res.ok, res.final, res.repairs)
```

Environment vars: `AIS_API_KEY`, `AIS_BASE_URL` can substitute for args.

## Status

Alpha: minimal endpoint coverage (only `/v1/immune/run`). PRs welcome for admin & billing helpers.

## License

Apache 2.0
