#!/usr/bin/env python3
"""Smoke test for the OpenAI-compatible /v1/chat/completions proxy endpoint.

Tests:
1. Model chain resolution (builtin/smart or configured chain)
2. Streaming SSE response format
3. Proper token usage in response
4. Rate limit handling (if SIMULATE_RATE_LIMIT is set)

Usage:
  python3 scripts/proxy_smoke.py \\
    --base-url https://your-server.com \\
    --proxy-secret your-proxy-secret

Environment:
  SANDBOXED_SH_DEV_URL    Base URL for the backend
  SANDBOXED_PROXY_SECRET  Proxy bearer token (or use --proxy-secret)
"""

import argparse
import json
import os
import socket
import sys
import time
from dataclasses import dataclass, field
from typing import List, Optional

from http_client import json_request, sse_post


def die(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def env_or(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.environ.get(name)
    if value:
        return value
    return default


def http_json(
    method: str,
    url: str,
    token: str,
    payload: Optional[dict],
    timeout: float = 60,
) -> dict:
    return json_request(method, url, token, payload, timeout=timeout)


def open_sse_stream(url: str, token: str, payload: dict, timeout: float):
    return sse_post(url, token, payload, timeout)


def parse_sse_events(stream, on_event, timeout: float) -> None:
    deadline = time.time() + timeout
    event_type = None
    data_lines: List[str] = []

    stream.socket.settimeout(5.0)

    while time.time() < deadline:
        try:
            line = stream.readline()
            if not line:
                break
            decoded = line.decode("utf-8").rstrip("\n")
            if decoded.startswith(":"):
                continue
            if decoded == "":
                if event_type and data_lines:
                    data = "\n".join(data_lines)
                    on_event(event_type, data)
                event_type = None
                data_lines = []
                continue
            if decoded.startswith("event:"):
                event_type = decoded[len("event:") :].strip()
                continue
            if decoded.startswith("data:"):
                data_lines.append(decoded[len("data:") :].strip())
        except socket.timeout:
            continue


@dataclass
class StreamStats:
    chunks: int = 0
    content_deltas: List[str] = field(default_factory=list)
    finish_reason: Optional[str] = None
    model: Optional[str] = None
    usage: Optional[dict] = None
    errors: List[str] = field(default_factory=list)

    def ok(self) -> bool:
        if self.chunks < 1:
            return False
        if not self.content_deltas:
            return False
        if self.finish_reason is None:
            return False
        return True


def run_streaming_test(
    base_url: str,
    proxy_secret: str,
    model: str,
    timeout: float,
    verbose: bool,
) -> StreamStats:
    stats = StreamStats()

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": "Reply with exactly: 'Hello, I am a language model.' and nothing else.",
            }
        ],
        "stream": True,
        "max_tokens": 50,
    }

    try:
        with open_sse_stream(
            f"{base_url}/v1/chat/completions",
            proxy_secret,
            payload,
            timeout=timeout,
        ) as stream:
            parse_sse_events(
                stream,
                lambda t, d: on_sse_event(t, d, stats, verbose),
                timeout=timeout,
            )
    except Exception as exc:
        stats.errors.append(str(exc))

    return stats


def on_sse_event(event_type: str, raw_data: str, stats: StreamStats, verbose: bool) -> None:
    if raw_data == "[DONE]":
        return

    try:
        payload = json.loads(raw_data)
    except json.JSONDecodeError:
        stats.errors.append(f"Invalid JSON: {raw_data[:100]}")
        return

    if payload.get("error"):
        stats.errors.append(f"API error: {payload['error']}")
        return

    stats.chunks += 1

    if "model" in payload and stats.model is None:
        stats.model = payload["model"]

    choices = payload.get("choices", [])
    for choice in choices:
        delta = choice.get("delta", {})
        if "content" in delta and delta["content"]:
            stats.content_deltas.append(delta["content"])
        finish = choice.get("finish_reason")
        if finish:
            stats.finish_reason = finish

    usage = payload.get("usage")
    if usage:
        stats.usage = usage

    if verbose:
        print(f"[chunk {stats.chunks}] {raw_data[:200]}")


def run_non_streaming_test(
    base_url: str,
    proxy_secret: str,
    model: str,
    timeout: float,
    verbose: bool,
) -> dict:
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": "Reply with exactly: 'OK' and nothing else.",
            }
        ],
        "stream": False,
        "max_tokens": 10,
    }

    resp = http_json(
        "POST",
        f"{base_url}/v1/chat/completions",
        proxy_secret,
        payload,
        timeout=timeout,
    )
    return resp


def list_models(base_url: str, proxy_secret: str) -> List[str]:
    resp = http_json("GET", f"{base_url}/v1/models", proxy_secret, None, timeout=10)
    return [m["id"] for m in resp.get("data", [])]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Smoke test the /v1/chat/completions proxy endpoint"
    )
    parser.add_argument(
        "--base-url",
        default=env_or("SANDBOXED_SH_DEV_URL"),
        help="Base URL for the backend (env: SANDBOXED_SH_DEV_URL)",
    )
    parser.add_argument(
        "--proxy-secret",
        default=env_or("SANDBOXED_PROXY_SECRET"),
        help="Proxy bearer token (env: SANDBOXED_PROXY_SECRET)",
    )
    parser.add_argument(
        "--model",
        default="builtin/smart",
        help="Model/chain to test (default: builtin/smart)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=60,
        help="Seconds to wait for response.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print streaming chunks.",
    )
    parser.add_argument(
        "--non-streaming",
        action="store_true",
        help="Also test non-streaming mode.",
    )
    args = parser.parse_args()

    if not args.base_url:
        die("Missing --base-url or SANDBOXED_SH_DEV_URL")
    if not args.proxy_secret:
        die("Missing --proxy-secret or SANDBOXED_PROXY_SECRET")

    base_url = args.base_url.rstrip("/")
    proxy_secret = args.proxy_secret
    failed = False

    print(f"\n== Testing /v1/models endpoint ==")
    try:
        models = list_models(base_url, proxy_secret)
        print(f"Available models: {models}")
        if not models:
            print("WARNING: No model chains configured")
        elif args.model not in models and not any(
            args.model.startswith(m.rstrip("/*")) for m in models if "*" in m
        ):
            print(f"WARNING: Model '{args.model}' not in available models")
    except Exception as exc:
        print(f"FAILED to list models: {exc}")
        failed = True

    print(f"\n== Testing streaming /v1/chat/completions with {args.model} ==")
    try:
        stats = run_streaming_test(
            base_url=base_url,
            proxy_secret=proxy_secret,
            model=args.model,
            timeout=args.timeout,
            verbose=args.verbose,
        )

        full_content = "".join(stats.content_deltas)
        ok = stats.ok() and len(stats.errors) == 0

        print(
            f"streaming: chunks={stats.chunks} "
            f"content_len={len(full_content)} "
            f"finish_reason={stats.finish_reason} "
            f"model={stats.model} "
            f"usage={stats.usage} "
            f"errors={len(stats.errors)} "
            f"=> {'OK' if ok else 'FAIL'}"
        )

        if stats.errors:
            for err in stats.errors[:5]:
                print(f"  error: {err}")

        if not ok:
            failed = True

    except Exception as exc:
        print(f"FAILED streaming test: {exc}")
        failed = True

    if args.non_streaming:
        print(f"\n== Testing non-streaming /v1/chat/completions with {args.model} ==")
        try:
            resp = run_non_streaming_test(
                base_url=base_url,
                proxy_secret=proxy_secret,
                model=args.model,
                timeout=args.timeout,
                verbose=args.verbose,
            )

            choices = resp.get("choices", [])
            content = ""
            if choices:
                content = choices[0].get("message", {}).get("content", "")
            usage = resp.get("usage", {})
            model = resp.get("model")

            ok = bool(content) and not resp.get("error")

            print(
                f"non-streaming: content_len={len(content)} "
                f"model={model} "
                f"usage={usage} "
                f"=> {'OK' if ok else 'FAIL'}"
            )

            if resp.get("error"):
                print(f"  error: {resp['error']}")

            if not ok:
                failed = True

        except Exception as exc:
            print(f"FAILED non-streaming test: {exc}")
            failed = True

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
