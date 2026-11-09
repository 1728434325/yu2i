#!/usr/bin/env python3
"""yu2i.site — a small static server. No dependencies, no root.

Serves ./ on 0.0.0.0:2778 with clean URLs, gzip, cache headers and a
custom 404. Logs one line per request to logs/access.log.
"""
from __future__ import annotations

import gzip
import logging
import mimetypes
import os
import posixpath
import socket
import sys
import urllib.parse
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "2778"))
HOST = os.environ.get("HOST", "0.0.0.0")

COMPRESSIBLE = (
    "text/html", "text/css", "text/plain", "text/xml", "application/javascript",
    "application/json", "application/xml", "image/svg+xml", "application/rss+xml",
)

log = logging.getLogger("yu2i")
log.setLevel(logging.INFO)
_fh = logging.FileHandler(ROOT / "logs" / "access.log", encoding="utf-8")
_fh.setFormatter(logging.Formatter("%(asctime)s %(message)s", "%Y-%m-%dT%H:%M:%S%z"))
log.addHandler(_fh)


def resolve(request_path: str) -> tuple[Path | None, str | None]:
    """Map a URL path to a file. Returns (file, redirect_target)."""
    path = urllib.parse.unquote(urllib.parse.urlsplit(request_path).path)
    had_slash = path.endswith("/") and path != "/"
    path = posixpath.normpath(path)
    if had_slash and path != "/":
        path += "/"
    if path.startswith("/..") or "\x00" in path:
        return None, None

    blocked = {"logs", "tools", "data", "scripts", "src"}
    first = path.lstrip("/").split("/")[0]
    blocked_file = {"server.py", "README.md", "AGENTS.md", "skills-lock.json"}
    ext = posixpath.splitext(path)[1].lower()
    if (
        first in blocked
        or first.startswith(".")
        or first in blocked_file
        or ext in {".py", ".md", ".tpl.html", ".sh", ".yml", ".yaml"}
    ):
        return None, None

    if path == "/":
        return ROOT / "index.html", None

    if path.endswith("/"):
        return ROOT / path.lstrip("/") / "index.html", None

    candidate = ROOT / path.lstrip("/")
    if candidate.is_file():
        return candidate, None
    if candidate.is_dir():
        return None, path + "/"
    if candidate.with_suffix(".html").is_file():
        return candidate.with_suffix(".html"), None
    return None, None


class Handler(BaseHTTPRequestHandler):
    server_version = "yu2i"
    sys_version = ""
    protocol_version = "HTTP/1.1"

    def do_GET(self) -> None:
        self.respond(head_only=False)

    def do_HEAD(self) -> None:
        self.respond(head_only=True)

    def respond(self, head_only: bool) -> None:
        status = 200
        body = b""
        headers: dict[str, str] = {}

        publish, redirect = resolve(self.path)
        if redirect:
            self.send_response(HTTPStatus.MOVED_PERMANENTLY)
            self.send_header("Location", redirect)
            self.send_header("Content-Length", "0")
            self.end_headers()
            self.log_it(301)
            return

        if publish is None or not publish.is_file():
            publish = ROOT / "404.html"
            status = 404
            if not publish.is_file():
                body = b"404 Not Found\n"
                headers["Content-Type"] = "text/plain; charset=utf-8"
            else:
                headers["Content-Type"] = "text/html; charset=utf-8"
        else:
            ctype = mimetypes.guess_type(publish.name)[0] or "application/octet-stream"
            if ctype.startswith("text/") or ctype in COMPRESSIBLE:
                ctype += "; charset=utf-8"
            headers["Content-Type"] = ctype

        if publish.is_file():
            raw = publish.read_bytes()
            ctype = headers.get("Content-Type", "")
            if (
                len(raw) >= 2048
                and "gzip" in self.headers.get("Accept-Encoding", "")
                and ctype.split(";")[0] in COMPRESSIBLE
            ):
                raw = gzip.compress(raw, 6)
                headers["Content-Encoding"] = "gzip"
            body = raw

        headers["Content-Length"] = str(len(body))
        headers["Vary"] = "Accept-Encoding"
        headers["X-Content-Type-Options"] = "nosniff"
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        headers["X-Frame-Options"] = "SAMEORIGIN"
        headers["Cross-Origin-Opener-Policy"] = "same-origin"
        headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=(), payment=()"
        headers["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
            "script-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; "
            "base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
        )
        if status == 404:
            headers["Cache-Control"] = "no-store"
        elif headers["Content-Type"].startswith("text/html"):
            headers["Cache-Control"] = "no-cache"
        else:
            headers["Cache-Control"] = "public, max-age=600"

        self.send_response(status)
        for key, value in headers.items():
            self.send_header(key, value)
        self.end_headers()
        if not head_only:
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                return
        self.log_it(status, len(body))

    def log_it(self, status: int, size: int = 0) -> None:
        # Behind the Cloudflare Tunnel the socket peer is 127.0.0.1, so prefer
        # the forwarded client IP headers; otherwise stats would count nobody.
        ip = (
            self.headers.get("CF-Connecting-IP")
            or self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or self.client_address[0]
        )
        ua = self.headers.get("User-Agent", "-")[:80]
        log.info('%s "%s %s" %s %s UA="%s"', ip, self.command, self.path, status, size, ua)

    def log_message(self, fmt: str, *args) -> None:  # silence default stderr noise
        return


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main() -> int:
    try:
        httpd = Server((HOST, PORT), Handler)
    except OSError as exc:
        print(f"cannot bind {HOST}:{PORT}: {exc}", file=sys.stderr)
        return 1
    print(f"yu2i.site serving {ROOT} on http://{HOST}:{PORT}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
