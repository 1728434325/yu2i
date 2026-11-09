#!/usr/bin/env python3
"""Gate for automated edits: static checks + live HTTP + link crawl.

    python3 tools/check_site.py

Exit 0 = safe to commit, 1 = something is broken. Prints one line per check.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parent.parent
BASE = "http://127.0.0.1:2778"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}
PAGES = ["/", "/notes/", "/lab/", "/lab/port-check.html", "/about.html",
         "/now.html", "/neighbors/", "/stats.html", "/search.html",
         "/posts/static-first.html", "/posts/port-2778.html", "/posts/toolkit.html"]
failures: list[str] = []


class Balance(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.errors: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.errors.append(f"line {self.getpos()[0]}: unexpected </{tag}>")


def check(name: str, ok: bool, detail: str = "") -> None:
    print(("PASS  " if ok else "FAIL  ") + name + ((" — " + detail) if detail and not ok else ""))
    if not ok:
        failures.append(name)


def html_balance() -> None:
    bad = 0
    for f in sorted(ROOT.rglob("*.html")):
        if f.parts[0] == "tools":
            continue
        p = Balance()
        p.feed(f.read_text(encoding="utf-8", errors="replace"))
        if p.errors or p.stack:
            bad += 1
            print(f"      {f}: {p.errors[:2] or p.stack[:3]}")
    check("html tag balance", bad == 0, f"{bad} file(s) unbalanced")


def css_balance() -> None:
    css = (ROOT / "assets" / "site.css").read_text(encoding="utf-8")
    depth = 0
    for ch in css:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth < 0:
                break
    check("css brace balance", depth == 0, f"depth={depth}")


def js_syntax() -> None:
    r = subprocess.run(["node", "--check", str(ROOT / "assets" / "site.js")],
                       capture_output=True, text=True)
    check("site.js syntax", r.returncode == 0, r.stderr.strip()[:120])


def no_third_party() -> None:
    hits = []
    for f in sorted(ROOT.rglob("*.html")):
        if f.parts[0] == "tools":
            continue
        s = f.read_text(encoding="utf-8", errors="replace")
        # only assets count as third-party: <script src>, <link href>, <img src>
        for m in re.finditer(r"<(?:script|link|img)[^>]*(?:src|href)=\"(https?://[^\"]+)\"", s, re.I):
            url = m.group(1)[7:]
            if url.startswith(("175.178.200", "yu2i.site")) or "127.0.0.1" in url:
                continue
            hits.append(f"{f}: {m.group(1)[:70]}")
    check("no third-party assets", not hits, "; ".join(hits[:3]))


def live_pages() -> None:
    for path in PAGES:
        try:
            req = urllib.request.Request(urljoin(BASE, path), method="GET")
            code = urllib.request.urlopen(req, timeout=6).status
        except Exception as e:
            code = getattr(e, "code", 0) or 0
        check(f"page {path}", code == 200, f"status {code}")


def internal_links() -> None:
    seen, bad = set(), []
    for f in sorted(ROOT.rglob("*.html")):
        if f.parts[0] == "tools":
            continue
        s = f.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r'(?:href|src)="([^"]+)"', s):
            u = m.group(1)
            if u.startswith(("http://", "https://", "mailto:", "#", "data:")) or "'" in u or "+" in u:
                continue
            full = urljoin(BASE, u)
            if full in seen:
                continue
            seen.add(full)
            try:
                code = urllib.request.urlopen(urllib.request.Request(full, method="HEAD"), timeout=6).status
            except Exception as e:
                code = getattr(e, "code", 0) or 0
            if code != 200:
                bad.append((f.name, u, code))
    check("internal links", not bad, f"{len(bad)} broken: {bad[:3]}")


def main() -> None:
    html_balance()
    css_balance()
    js_syntax()
    no_third_party()
    live_pages()
    internal_links()
    print()
    if failures:
        print(f"RESULT: FAIL ({len(failures)})")
        sys.exit(1)
    print("RESULT: PASS — safe to commit")


if __name__ == "__main__":
    main()
