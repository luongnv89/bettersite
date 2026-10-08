"""Durable scan consumption regressions without external service calls."""

from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "scan_attempt.py"
sys.path.insert(0, str(SCRIPT.parent))
import scan_attempt as scans

URL = "https://source.example/"


class ScanAttemptTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.state = Path(self.directory.name) / "run-state.json"
        self.state.write_text(json.dumps({"wc_session": "test-session", "mode": "auto", "source_policy": {"classification": "public"}}))

    def test_claim_persists_before_any_scan_and_preserves_run_state(self):
        attempt = scans.claim_attempt(self.state, URL)
        self.assertTrue(attempt["consumed"])
        self.assertEqual(attempt["outcome"], "reserved")
        state = scans.read_object(self.state)
        self.assertEqual(state["wc_session"], "test-session")
        self.assertEqual(state["source_policy"]["classification"], "public")
        self.assertEqual(state["scan_attempt"], scans.read_object(self.state.with_name("scan-attempt.json")))
        with self.assertRaises(scans.AttemptConsumed):
            scans.claim_attempt(self.state, URL)

    def test_every_finished_outcome_consumes_the_attempt(self):
        for outcome in scans.OUTCOMES:
            with self.subTest(outcome=outcome), tempfile.TemporaryDirectory() as directory:
                state = Path(directory) / "run-state.json"
                state.write_text("{}")
                scans.claim_attempt(state, URL)
                scans.finish_attempt(state, URL, outcome)
                self.assertEqual(scans.read_object(state)["scan_attempt"]["outcome"], outcome)
                with self.assertRaises(scans.AttemptConsumed):
                    scans.claim_attempt(state, URL)

    def test_failed_state_write_keeps_durable_consumption(self):
        with patch.object(scans, "save_state", side_effect=OSError("cannot save")):
            with self.assertRaises(OSError):
                scans.claim_attempt(self.state, URL)
        self.assertTrue(self.state.with_name("scan-attempt.json").exists())
        with self.assertRaises(scans.AttemptConsumed):
            scans.claim_attempt(self.state, URL)
        scans.finish_attempt(self.state, URL, "unknown")
        self.assertEqual(scans.read_object(self.state)["scan_attempt"]["outcome"], "unknown")

    def test_resume_does_not_reset_consumption_when_cache_is_absent_or_expired(self):
        scans.claim_attempt(self.state, URL)
        scans.finish_attempt(self.state, URL, "success")
        # No scan.json cache is needed for the budget guard, including after a pause.
        with self.assertRaises(scans.AttemptConsumed):
            scans.claim_attempt(self.state, URL)

    def test_reset_run_state_cannot_reset_budget(self):
        scans.claim_attempt(self.state, URL)
        self.state.write_text("{}")
        with self.assertRaises(scans.AttemptConsumed):
            scans.claim_attempt(self.state, URL)

    def test_missing_marker_does_not_reset_recorded_attempt(self):
        scans.claim_attempt(self.state, URL)
        self.state.with_name("scan-attempt.json").unlink()
        with self.assertRaises(scans.AttemptConsumed):
            scans.claim_attempt(self.state, URL)

    def test_corrupt_marker_still_consumes_attempt(self):
        self.state.with_name("scan-attempt.json").write_text("")
        with self.assertRaises(scans.AttemptConsumed):
            scans.claim_attempt(self.state, URL)

    def test_two_orchestrators_cannot_claim_two_attempts(self):
        def claim():
            try:
                scans.claim_attempt(self.state, URL)
                return "claimed"
            except scans.AttemptConsumed:
                return "consumed"
        with ThreadPoolExecutor(max_workers=2) as executor:
            self.assertCountEqual(list(executor.map(lambda _: claim(), range(2))), ["claimed", "consumed"])

    def test_finish_refuses_mismatched_url_and_duplicate_outcome(self):
        scans.claim_attempt(self.state, URL)
        with self.assertRaises(ValueError):
            scans.finish_attempt(self.state, "https://other.example/", "success")
        scans.finish_attempt(self.state, URL, "timeout")
        with self.assertRaises(ValueError):
            scans.finish_attempt(self.state, URL, "success")

    def test_malformed_state_and_missing_claim_fail_closed(self):
        with self.assertRaises(OSError):
            scans.finish_attempt(self.state, URL, "success")
        self.state.write_text("null")
        with self.assertRaises(ValueError):
            scans.claim_attempt(self.state, URL)
        self.assertFalse(self.state.with_name("scan-attempt.json").exists())


if __name__ == "__main__":
    unittest.main()
