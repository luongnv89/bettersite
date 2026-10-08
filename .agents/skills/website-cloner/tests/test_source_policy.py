"""Source address and redirect policy regressions; DNS is always mocked."""

import json
from pathlib import Path
import socket
import subprocess
import sys
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "classify_url.py"
sys.path.insert(0, str(SCRIPT.parent))
import classify_url as policy


def records(*addresses):
    return [(socket.AF_INET6 if ":" in address else socket.AF_INET, socket.SOCK_STREAM, 6, "", (address, 443)) for address in addresses]


class SourcePolicyTests(unittest.TestCase):
    def test_non_public_literals(self):
        for host in ("127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.1.1", "100.64.0.1", "0.0.0.0", "192.0.2.1", "224.0.0.1", "[::1]", "[::]", "[fd00::1]", "[fe80::1]", "[ff02::1]", "[::ffff:10.0.0.1]"):
            with self.subTest(host=host):
                self.assertEqual(policy.classify_url(f"http://{host}/")["classification"], "non_public")

    def test_public_literals(self):
        for host in ("8.8.8.8", "1.1.1.1", "[2606:4700:4700::1111]", "[::ffff:8.8.8.8]"):
            with self.subTest(host=host):
                self.assertEqual(policy.classify_url(f"https://{host}/")["classification"], "public")

    def test_local_names_are_not_resolved(self):
        def unexpected(*args, **kwargs):
            self.fail("local hostname reached DNS")
        for host in ("localhost", "localhost.", "printer", "test.local", "site.internal", "foo.localhost", "router.home.arpa"):
            with self.subTest(host=host):
                self.assertEqual(policy.classify_url(f"http://{host}/", unexpected)["classification"], "non_public")

    def test_dns_requires_all_addresses_to_be_global(self):
        for addresses in (("8.8.8.8", "10.0.0.1"), ("8.8.8.8", "fd00::1"), ("169.254.1.1",)):
            with self.subTest(addresses=addresses):
                result = policy.classify_url("https://source.example/", lambda *args, **kwargs: records(*addresses))
                self.assertEqual(result["classification"], "non_public")
                self.assertEqual(set(result["addresses"]), set(addresses))

    def test_public_dns_in_both_families(self):
        result = policy.classify_url("https://source.example/", lambda *args, **kwargs: records("8.8.8.8", "2606:4700:4700::1111"))
        self.assertEqual(result["classification"], "public")

    def test_dns_failures_and_unknown_addresses_fail_closed(self):
        def failed(*args, **kwargs):
            raise socket.gaierror("unresolved")
        for resolver in (failed, lambda *args, **kwargs: [], lambda *args, **kwargs: [(socket.AF_UNIX, 0, 0, "", ("unknown", 0))], lambda *args, **kwargs: records("unknown")):
            with self.subTest(resolver=resolver):
                self.assertEqual(policy.classify_url("https://source.example/", resolver)["classification"], "non_public")

    def test_invalid_or_credentialed_url_is_non_public(self):
        for url in ("file:///tmp/site", "http:///missing-host", "http://[bad]/", "https://user:password@8.8.8.8/", "http://8.8.8.8:invalid", "http://8.8.8.8:99999", "http://[fe80::1%25en0]/", "https://8.8.8.8/\n"):
            with self.subTest(url=url):
                self.assertEqual(policy.classify_url(url)["classification"], "non_public")

    def test_non_public_redirect_taints_entire_chain(self):
        result = policy.classify_chain(["https://8.8.8.8/", "http://[fd00::1]/", "https://1.1.1.1/"])
        self.assertEqual(result["classification"], "non_public")
        self.assertEqual(len(result["hops"]), 3)

    def test_public_redirect_chain_remains_public(self):
        self.assertEqual(policy.classify_chain(["https://8.8.8.8/", "https://1.1.1.1/"])["classification"], "public")

    def test_unresolved_redirect_is_non_public(self):
        def failed(*args, **kwargs):
            raise socket.gaierror("unresolved")
        self.assertEqual(policy.classify_chain(["https://8.8.8.8/", "https://unknown.example/"], failed)["classification"], "non_public")

    def test_cli_denies_private_redirect(self):
        result = subprocess.run([sys.executable, "-B", str(SCRIPT), "--url", "https://8.8.8.8/", "--redirect", "http://[fd00::1]/"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(json.loads(result.stdout)["classification"], "non_public")


if __name__ == "__main__":
    unittest.main()
