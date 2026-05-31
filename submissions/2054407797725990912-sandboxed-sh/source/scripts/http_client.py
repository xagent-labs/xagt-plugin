"""HTTP helpers for smoke scripts.

Cloudflare currently blocks Python's stdlib urllib TLS fingerprint for the
public dev backend with error 1010. Prefer requests when available; keep urllib
as a dependency-free fallback for local/direct-origin runs.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Optional

try:
    import requests
except ImportError:  # pragma: no cover - exercised on minimal systems only.
    requests = None


class HttpError(RuntimeError):
    pass


class RequestsStream:
    def __init__(self, response):
        self._response = response
        self._raw = response.raw
        self.socket = self

    def settimeout(self, _timeout: float) -> None:
        return None

    def readline(self) -> bytes:
        return self._raw.readline()

    def close(self) -> None:
        self._response.close()


def json_request(
    method: str,
    url: str,
    token: str,
    payload: Optional[dict],
    timeout: float = 30,
) -> dict:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if requests is not None:
        response = requests.request(
            method,
            url,
            headers=headers,
            json=payload if payload is not None else None,
            timeout=timeout,
        )
        if response.status_code >= 400:
            raise HttpError(f"HTTP {response.status_code} from {url}: {response.text}")
        return response.json() if response.text else {}

    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    for key, value in headers.items():
        req.add_header(key, value)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        raise HttpError(f"HTTP {exc.code} from {url}: {body}") from exc


def sse_get(url: str, token: str, timeout: float):
    headers = {"Authorization": f"Bearer {token}", "Accept": "text/event-stream"}
    if requests is not None:
        response = requests.get(url, headers=headers, stream=True, timeout=timeout)
        if response.status_code >= 400:
            raise HttpError(f"HTTP {response.status_code} from {url}: {response.text}")
        response.raw.decode_content = True
        return RequestsStream(response)

    req = urllib.request.Request(url, method="GET")
    for key, value in headers.items():
        req.add_header(key, value)
    return urllib.request.urlopen(req, timeout=timeout)


def sse_post(url: str, token: str, payload: dict, timeout: float):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }
    if requests is not None:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            stream=True,
            timeout=timeout,
        )
        if response.status_code >= 400:
            raise HttpError(f"HTTP {response.status_code} from {url}: {response.text}")
        response.raw.decode_content = True
        return RequestsStream(response)

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    for key, value in headers.items():
        req.add_header(key, value)
    return urllib.request.urlopen(req, timeout=timeout)
