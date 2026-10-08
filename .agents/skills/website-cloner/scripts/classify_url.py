#!/usr/bin/env python3
"""Classify URLs with local DNS only; never fetch a page or send it to a service."""

from __future__ import annotations

import argparse
import ipaddress
import json
import socket
import sys
from urllib.parse import urlsplit


def public_address(value):
    address = ipaddress.ip_address(value)
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        address = address.ipv4_mapped
    return address.is_global and not (
        address.is_multicast or address.is_reserved or address.is_unspecified
    )


def classify_url(url, resolver=None):
    """Public requires every locally resolved address to be globally routable."""
    result = {"url": url, "classification": "non_public", "addresses": []}
    try:
        if not isinstance(url, str) or any(char.isspace() or ord(char) < 32 for char in url):
            raise ValueError("URL contains whitespace or control characters")
        parsed = urlsplit(url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            raise ValueError("an absolute HTTP(S) URL is required")
        if parsed.username is not None or parsed.password is not None:
            raise ValueError("URL credentials cannot be sent remotely")
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        host = parsed.hostname.lower().rstrip(".")
        if not host or "%" in host:
            raise ValueError("empty or scoped/encoded host")
        result["host"] = host
        if host == "localhost" or host.endswith((".localhost", ".local", ".internal", ".home.arpa")):
            result["reason"] = "local_hostname"
            return result
        try:
            addresses = [str(ipaddress.ip_address(host))]
        except ValueError:
            if "." not in host:
                result["reason"] = "unqualified_hostname"
                return result
            host = host.encode("idna").decode("ascii")
            lookup = resolver or socket.getaddrinfo
            records = lookup(host, port, type=socket.SOCK_STREAM)
            if not records or any(record[0] not in (socket.AF_INET, socket.AF_INET6) for record in records):
                raise ValueError("DNS yielded no known IP addresses")
            addresses = sorted({record[4][0] for record in records})
        result["addresses"] = addresses
        if all(public_address(address) for address in addresses):
            result.update(classification="public", reason="all_addresses_global")
        else:
            result["reason"] = "non_global_address"
    except (ValueError, UnicodeError, OSError) as exc:
        result["reason"] = "invalid_or_unresolved"
        result["detail"] = str(exc)
    return result


def classify_chain(urls, resolver=None):
    """Keep the entire observed redirect chain private if any hop is private."""
    hops = [classify_url(url, resolver) for url in urls]
    return {
        "classification": "public" if hops and all(hop["classification"] == "public" for hop in hops) else "non_public",
        "hops": hops,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True)
    parser.add_argument("--redirect", action="append", default=[], help="absolute observed redirect target; repeat in order")
    args = parser.parse_args(argv)
    result = classify_chain([args.url, *args.redirect])
    json.dump(result, sys.stdout, sort_keys=True)
    sys.stdout.write("\n")
    return 0 if result["classification"] == "public" else 1


if __name__ == "__main__":
    raise SystemExit(main())
