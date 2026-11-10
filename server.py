#!/usr/bin/env python3
"""yu2i.site 静态服务器（Astro dist 版）。

- 只服务 dist/ 内的静态文件，不暴露源码、日志、构建配置
- 旧 URL 301 到新 URL
- gzip、缓存头、安全头（含 Pagefind 需要的 wasm-unsafe-eval）
"""
from __future__ import annotations

import gzip
import logging
import mimetypes
import os
import posixpath
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "2778"))
BASE = Path(__file__).resolve().parent
ROOT = BASE / "dist"
LOG_DIR = BASE / "logs"
LOG_DIR.mkdir(exist_ok=True)

mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("image/svg+xml", ".svg")

REDIRECTS = {
    "/index.html": "/",
    "/about.html": "/about/",
    "/now.html": "/now/",
    "/neighbors/": "/friends/",
    "/notes/": "/posts/",
    "/search.html": "/search/",
    "/stats.html": "/",
    "/feed.xml": "/rss.xml",
    "/posts/static-first.html": "/posts/static-first/",
    "/posts/port-2778.html": "/posts/port-2778/",
    "/posts/toolkit.html": "/posts/toolkit/",
    "/posts/rebuild-again.html": "/posts/rebuild-again/",
    "/lab/port-check.html": "/lab/",
}

BLOCKED_PARTS = {"logs", "node_modules", "src", "scripts", "docs", ".git"}
BLOCKED_FILES = {"server.py", "package.json", "pnpm-lock.yaml", "astro.config.mjs", "tsconfig.json"}

COMPRESSIBLE = {"text/html", "text/css", "application/javascript", "application/json",
                "image/svg+xml", "application/xml", "text/plain", "application/wasm", "text/xml"}

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[logging.FileHandler(LOG_DIR / "access.log", encoding="utf-8"), logging.StreamHandler()],
)
log = logging.getLogger("yu2i")

CSP = (
    "default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; "
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; connect-src 'self'; "
    "worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; "
    "frame-ancestors 'none'"
)


class Handler(BaseHTTPRequestHandler):
    server_version = "yu2i"
    sys_version = ""
    protocol_version = "HTTP/1.0"

    def log_message(self, fmt: str, *args) -> None:
        log.info("%s %s", self.address_string(), fmt % args)

    def do_HEAD(self) -> None:
        self._serve(head_only=True)

    def do_GET(self) -> None:
        self._serve(head_only=False)

    def _serve(self, head_only: bool) -> None:
        path = urlsplit(self.path).path
        path = unquote(path)

        if path in REDIRECTS:
            self.send_response(301)
            self.send_header("Location", REDIRECTS[path])
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        if path.startswith("/.") or any(part in BLOCKED_PARTS for part in path.split("/")):
            self._not_found(head_only)
            return

        target, status = self._resolve(path)
        if target is None:
            self._not_found(head_only)
            return
        if status == 301:
            self.send_response(301)
            self.send_header("Location", path.rstrip("/") + "/")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        if target.name in BLOCKED_FILES or target.suffix in {".md", ".py", ".sh", ".yml", ".yaml"}:
            self._not_found(head_only)
            return

        try:
            raw = target.read_bytes()
        except OSError:
            self._not_found(head_only)
            return

        ctype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        if target.name.endswith(".pagefind") or target.name.endswith(".pf_meta"):
            ctype = "application/wasm" if target.name.endswith(".pagefind") else "application/octet-stream"
        headers = {
            "Content-Type": ctype,
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-Frame-Options": "SAMEORIGIN",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Permissions-Policy": "geolocation=(), camera=(), microphone=(), payment=()",
            "Content-Security-Policy": CSP if not os.environ.get("NO_CSP") else "",
            "Vary": "Accept-Encoding",
        }

        if ctype in COMPRESSIBLE and len(raw) > 1024 and not os.environ.get("NO_GZIP") and "gzip" in self.headers.get("Accept-Encoding", ""):
            raw = gzip.compress(raw, 6)
            headers["Content-Encoding"] = "gzip"

        rel = target.relative_to(ROOT).as_posix()
        if rel.startswith("_astro/"):
            headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif path.startswith("/pagefind/"):
            headers["Cache-Control"] = "public, max-age=86400"
        elif ctype == "text/html":
            headers["Cache-Control"] = "no-cache"
        else:
            headers["Cache-Control"] = "public, max-age=600"

        headers["Content-Length"] = str(len(raw))
        self.send_response(status)
        for k, v in headers.items():
            self.send_header(k, v)
        self.end_headers()
        if not head_only:
            self.wfile.write(raw)

    def _resolve(self, path: str):
        if path == "/" or path == "":
            return ROOT / "index.html", 200
        clean = path.lstrip("/")
        if ".." in clean:
            return None, 404

        trailing = path.endswith("/")
        candidate = ROOT / clean
        if trailing:
            idx = candidate / "index.html"
            return (idx, 200) if idx.is_file() else (None, 404)
        if candidate.is_file():
            return candidate, 200
        idx = candidate / "index.html"
        if idx.is_file():
            return None, 301
        html = ROOT / (clean + ".html")
        if html.is_file():
            return html, 200
        return None, 404

    def _not_found(self, head_only: bool) -> None:
        page = ROOT / "404.html"
        raw = page.read_bytes() if page.is_file() else b"404"
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Security-Policy", CSP)
        self.end_headers()
        if not head_only:
            self.wfile.write(raw)


def main() -> None:
    if not ROOT.is_dir():
        raise SystemExit(f"dist not found: {ROOT}")
    srv = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"yu2i.site serving {ROOT} on http://{HOST}:{PORT}", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
