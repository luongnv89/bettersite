#!/usr/bin/env python3
"""Reserve the single external scan attempt durably before approving G1."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import tempfile


OUTCOMES = ("success", "failed", "timeout", "non-200", "invalid-response", "unknown")


class AttemptConsumed(ValueError):
    pass


def read_object(path):
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path.name} must contain a JSON object")
    return value


def save_state(path, state):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(state, stream, sort_keys=True)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def claim_attempt(state_path, url):
    """An exclusive companion file remains consumed even if state writing fails."""
    state_path = Path(state_path)
    state = read_object(state_path)
    marker = state_path.with_name("scan-attempt.json")
    if "scan_attempt" in state or marker.exists():
        raise AttemptConsumed("external scan attempt already consumed; decline fresh G1")
    attempt = {"consumed": True, "url": url, "claimed_at": datetime.now(timezone.utc).isoformat(), "outcome": "reserved"}
    try:
        descriptor = os.open(marker, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError as exc:
        raise AttemptConsumed("external scan attempt already consumed; decline fresh G1") from exc
    # Never remove the marker after an error: an uncertain attempt stays consumed.
    with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
        json.dump(attempt, stream, sort_keys=True)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    state["scan_attempt"] = attempt
    save_state(state_path, state)
    return attempt


def finish_attempt(state_path, url, outcome):
    if outcome not in OUTCOMES:
        raise ValueError("unknown scan outcome")
    state_path = Path(state_path)
    state = read_object(state_path)
    attempt = read_object(state_path.with_name("scan-attempt.json"))
    if attempt.get("consumed") is not True or attempt.get("url") != url:
        raise ValueError("scan claim does not match the original URL")
    previous = state.get("scan_attempt")
    if previous is not None and previous != attempt:
        raise ValueError("scan outcome already recorded or state disagrees with the claim")
    attempt.update(outcome=outcome, finished_at=datetime.now(timezone.utc).isoformat())
    state["scan_attempt"] = attempt
    save_state(state_path, state)
    return attempt


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("claim", "finish"))
    parser.add_argument("--state", required=True, type=Path)
    parser.add_argument("--url", required=True)
    parser.add_argument("--outcome", choices=OUTCOMES)
    args = parser.parse_args(argv)
    try:
        if not args.state.is_absolute():
            raise ValueError("--state must be an absolute existing run-state.json path")
        if args.action == "finish" and args.outcome is None:
            raise ValueError("finish requires --outcome")
        attempt = claim_attempt(args.state, args.url) if args.action == "claim" else finish_attempt(args.state, args.url, args.outcome)
    except AttemptConsumed as exc:
        print(f"error[scan-consumed]: {exc}", file=sys.stderr)
        return 1
    except (OSError, ValueError) as exc:
        print(f"error[scan-attempt]: {exc}", file=sys.stderr)
        print("fix: preserve the scan-attempt.json marker; decline fresh G1 until valid state is restored", file=sys.stderr)
        return 2
    json.dump(attempt, sys.stdout, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
