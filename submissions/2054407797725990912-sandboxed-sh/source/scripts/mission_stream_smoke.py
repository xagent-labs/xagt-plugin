#!/usr/bin/env python3
"""Smoke test mission streaming against a Sandboxed.sh backend.

Runs a mission for each backend (claudecode, opencode, codex), sends a task
plus a queued message, and verifies that streaming includes:
- thinking events
- tool_call + tool_result events
- text deltas and final assistant messages
"""

import argparse
import json
import os
import socket
import sys
import threading
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

from http_client import json_request, sse_get

DEFAULT_BACKENDS = ["claudecode", "opencode", "codex"]


def die(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def env_or(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.environ.get(name)
    if value:
        return value
    return default


def parse_backend_map(values: Optional[List[str]], flag_name: str) -> Dict[str, str]:
    parsed: Dict[str, str] = {}
    for raw in values or []:
        backend, sep, value = raw.partition("=")
        backend = backend.strip()
        value = value.strip()
        if sep != "=" or not backend or not value:
            die(
                f"Invalid {flag_name} '{raw}'. Expected format backend=value "
                "(example: opencode=builtin/smart)."
            )
        parsed[backend] = value
    return parsed


@dataclass
class StreamStats:
    thinking_chunks: int = 0
    text_deltas: int = 0
    assistant_messages: int = 0
    tool_calls: int = 0
    tool_results: int = 0
    assistant_models: Set[str] = field(default_factory=set)
    tool_call_ids: Set[str] = field(default_factory=set)
    tool_result_ids: Set[str] = field(default_factory=set)
    errors: List[str] = field(default_factory=list)

    def has_required_events(self, require_thinking: bool) -> bool:
        if self.assistant_messages < 2:
            return False
        if self.text_deltas < 1:
            return False
        if require_thinking and self.thinking_chunks < 1:
            return False
        if self.tool_calls < 1 or self.tool_results < 1:
            return False
        if not (self.tool_call_ids & self.tool_result_ids):
            return False
        return True


def http_json(method: str, url: str, token: str, payload: Optional[dict]) -> dict:
    return json_request(method, url, token, payload, timeout=30)


def open_sse_stream(url: str, token: str, timeout: float):
    return sse_get(url, token, timeout)


def parse_sse(stream, on_event, stop_event: threading.Event, timeout: float) -> None:
    event_type = None
    data_lines: List[str] = []
    while not stop_event.is_set():
        try:
            line = stream.readline()
        except socket.timeout:
            continue
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


class StreamWatcher(threading.Thread):
    def __init__(
        self,
        base_url: str,
        token: str,
        mission_id: str,
        stats: StreamStats,
        stop_event: threading.Event,
        timeout: float,
        require_thinking: bool,
        verbose: bool,
    ) -> None:
        super().__init__(daemon=True)
        self.base_url = base_url
        self.token = token
        self.mission_id = mission_id
        self.stats = stats
        self.stop_event = stop_event
        self.timeout = timeout
        self.require_thinking = require_thinking
        self.verbose = verbose

    def run(self) -> None:
        deadline = time.time() + self.timeout
        while not self.stop_event.is_set() and time.time() < deadline:
            try:
                with open_sse_stream(
                    f"{self.base_url}/api/control/stream",
                    self.token,
                    timeout=5,
                ) as stream:
                    parse_sse(stream, self.on_event, self.stop_event, timeout=5)
            except Exception as exc:
                self.stats.errors.append(str(exc))
                time.sleep(1)

    def on_event(self, event_type: str, raw_data: str) -> None:
        try:
            payload = json.loads(raw_data)
        except json.JSONDecodeError:
            return
        mission_id = payload.get("mission_id")
        if mission_id and mission_id != self.mission_id:
            return
        if event_type == "thinking":
            if payload.get("content"):
                self.stats.thinking_chunks += 1
        elif event_type == "text_delta":
            if payload.get("content"):
                self.stats.text_deltas += 1
        elif event_type == "assistant_message":
            self.stats.assistant_messages += 1
            model = payload.get("model")
            if isinstance(model, str) and model.strip():
                self.stats.assistant_models.add(model.strip())
        elif event_type == "tool_call":
            self.stats.tool_calls += 1
            tool_call_id = payload.get("tool_call_id")
            if tool_call_id:
                self.stats.tool_call_ids.add(tool_call_id)
        elif event_type == "tool_result":
            self.stats.tool_results += 1
            tool_call_id = payload.get("tool_call_id")
            if tool_call_id:
                self.stats.tool_result_ids.add(tool_call_id)

        if self.verbose:
            print(f"[{self.mission_id}] {event_type}: {raw_data}")


@dataclass
class MissionResult:
    backend: str
    mission_id: str
    stats: StreamStats
    queued_ok: bool


def run_backend(
    base_url: str,
    token: str,
    workspace_id: str,
    backend: str,
    timeout: float,
    require_thinking: bool,
    verbose: bool,
    model_override: Optional[str],
) -> MissionResult:
    title = f"stream-smoke-{backend}-{int(time.time())}"
    payload = {
        "title": title,
        "workspace_id": workspace_id,
        "backend": backend,
    }
    if model_override:
        payload["model_override"] = model_override
    mission = http_json("POST", f"{base_url}/api/control/missions", token, payload)
    mission_id = mission.get("id")
    if not mission_id:
        raise RuntimeError(f"Failed to create mission for {backend}: {mission}")

    http_json("POST", f"{base_url}/api/control/missions/{mission_id}/load", token, {})

    stats = StreamStats()
    stop_event = threading.Event()
    watcher = StreamWatcher(
        base_url,
        token,
        mission_id,
        stats,
        stop_event,
        timeout,
        require_thinking,
        verbose,
    )
    watcher.start()

    test_file = f"stream_test_{backend}.txt"
    message_1 = (
        "This is a streaming smoke test. Use the Bash tool for every step. "
        "Steps: "
        f"1) Run: printf 'stream-test:%s\\n' \"$(date)\" > {test_file} "
        "2) Run: sleep 4 "
        f"3) Run: ls -1 {test_file} "
        "Then reply with a one-line summary."
    )
    message_2 = "Queued message: once you finish, reply with 'queued-ok'."

    http_json("POST", f"{base_url}/api/control/message", token, {"content": message_1})
    queued_resp = http_json(
        "POST", f"{base_url}/api/control/message", token, {"content": message_2}
    )
    queued_ok = bool(queued_resp.get("queued"))

    deadline = time.time() + timeout
    while time.time() < deadline:
        if stats.has_required_events(require_thinking):
            break
        time.sleep(0.5)

    stop_event.set()
    watcher.join(timeout=5)

    return MissionResult(backend=backend, mission_id=mission_id, stats=stats, queued_ok=queued_ok)


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke test mission streaming")
    parser.add_argument(
        "--base-url",
        default=env_or("SANDBOXED_SH_DEV_URL"),
        help="Base URL for the backend (env: SANDBOXED_SH_DEV_URL)",
    )
    parser.add_argument(
        "--token",
        default=env_or("SANDBOXED_SH_TOKEN"),
        help="Auth token (env: SANDBOXED_SH_TOKEN)",
    )
    parser.add_argument(
        "--workspace-id",
        default=env_or("SANDBOXED_SH_WORKSPACE_ID"),
        help="Workspace UUID (env: SANDBOXED_SH_WORKSPACE_ID)",
    )
    parser.add_argument(
        "--backend",
        action="append",
        help="Backend to test (repeatable). Defaults to claudecode/opencode/codex.",
    )
    parser.add_argument(
        "--model-override",
        action="append",
        help=(
            "Backend-specific model override in backend=model format "
            "(repeatable, e.g. opencode=builtin/smart)."
        ),
    )
    parser.add_argument(
        "--expect-model",
        action="append",
        help=(
            "Backend-specific expected resolved model substring in backend=substring "
            "format (repeatable)."
        ),
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=180,
        help="Seconds to wait per backend.",
    )
    parser.add_argument(
        "--allow-no-thinking",
        action="store_true",
        help="Allow missing thinking events (still requires text_delta).",
    )
    parser.add_argument(
        "--allow-missing-model",
        action="store_true",
        help="Do not fail when assistant_message events omit model metadata.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print streaming events.",
    )
    args = parser.parse_args()

    if not args.base_url:
        die("Missing --base-url or SANDBOXED_SH_DEV_URL")
    if not args.token:
        die("Missing --token or SANDBOXED_SH_TOKEN")
    if not args.workspace_id:
        die("Missing --workspace-id or SANDBOXED_SH_WORKSPACE_ID")

    base_url = args.base_url.rstrip("/")
    token = args.token
    workspace_id = args.workspace_id
    backends = args.backend or DEFAULT_BACKENDS
    require_thinking = not args.allow_no_thinking
    model_overrides = parse_backend_map(args.model_override, "--model-override")
    expected_models = parse_backend_map(args.expect_model, "--expect-model")

    results: List[MissionResult] = []
    failed = False

    for backend in backends:
        print(f"\n== Running stream test for {backend} ==")
        try:
            result = run_backend(
                base_url=base_url,
                token=token,
                workspace_id=workspace_id,
                backend=backend,
                timeout=args.timeout,
                require_thinking=require_thinking,
                verbose=args.verbose,
                model_override=model_overrides.get(backend),
            )
            results.append(result)
        except Exception as exc:
            failed = True
            print(f"{backend}: FAILED to run: {exc}")
            continue

    for result in results:
        stats = result.stats
        model_ok = args.allow_missing_model or bool(stats.assistant_models)
        expected_substring = expected_models.get(result.backend)
        expected_ok = True
        if expected_substring:
            expected_ok = any(
                expected_substring in model for model in stats.assistant_models
            )
        ok = (
            stats.has_required_events(require_thinking)
            and result.queued_ok
            and model_ok
            and expected_ok
        )
        if not ok:
            failed = True
        models_display = ",".join(sorted(stats.assistant_models)) or "-"
        print(
            f"{result.backend}: "
            f"assistant_messages={stats.assistant_messages} "
            f"thinking={stats.thinking_chunks} "
            f"text_deltas={stats.text_deltas} "
            f"tool_calls={stats.tool_calls} "
            f"tool_results={stats.tool_results} "
            f"models={models_display} "
            f"queued={result.queued_ok} "
            f"errors={len(stats.errors)} "
            f"=> {'OK' if ok else 'FAIL'}"
        )
        if expected_substring and not expected_ok:
            print(
                f"  expected model substring '{expected_substring}' "
                f"not found in {sorted(stats.assistant_models)}"
            )

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
