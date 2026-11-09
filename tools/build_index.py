#!/usr/bin/env python3
"""Regenerate search-index.json from the site's HTML. Stdlib only.

Reads <title>, <meta description>, the first h1/h2, and body text from each
article and lab page. Run after adding a post:

    python3 tools/build_index.py
"""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "search-index.json"

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def clean(text: str) -> str:
    text = TAG_RE.sub(" ", text)
    text = html.unescape(text)
    return WS_RE.sub(" ", text).strip()


def pick(pattern: str, text: str, flags=re.S | re.I) -> str:
    m = re.search(pattern, text, flags)
    return clean(m.group(1)) if m else ""


def collect(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    title = pick(r"<title>(.*?)</title>", raw)
    title = re.split(r"\s[—–-]\s", title)[0].strip()
    desc = ""
    m = re.search(r'<meta name="description" content="([^"]*)"', raw)
    if m:
        desc = html.unescape(m.group(1))
    kicker = pick(r'class="row__kicker"[^>]*>(.*?)</span>', raw) or pick(
        r'class="article__kicker"[^>]*>(.*?)</p>', raw
    )
    date = ""
    m = re.search(r'article:published_time" content="([^"]+)"', raw)
    if m:
        date = m.group(1)
    body = pick(r'<div class="prose"[^>]*>(.*?)</div>', raw)
    if not body:
        body = pick(r"<main[^>]*>(.*?)</main>", raw)
    # keep a readable slice, not the full page
    text = body[:900]
    return {
        "title": title,
        "desc": desc or kicker,
        "kicker": kicker,
        "date": date,
        "tags": [],
        "url": "/" + str(path.relative_to(ROOT)),
        "text": text,
    }


def main() -> None:
    items: list[dict] = []
    for path in sorted(ROOT.glob("posts/*.html")) + sorted(ROOT.glob("lab/*.html")):
        if path.name == "index.html":
            continue
        items.append(collect(path))
    for path in [ROOT / "about.html", ROOT / "now.html"]:
        item = collect(path)
        item["title"] = item["title"] or "关于"
        items.append(item)
    items.sort(key=lambda i: i["date"], reverse=True)
    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {OUT} ({len(items)} entries, {OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
