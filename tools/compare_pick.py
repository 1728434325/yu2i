#!/usr/bin/env python3
"""Pick one comparison blog and dump comparable metrics. Stdlib only.

    python3 tools/compare_pick.py

Prints JSON: candidate site, its measurable traits, our traits, and a short
list of concrete gaps the agent can choose from.
"""
from __future__ import annotations

import json
import random
import re
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HISTORY = ROOT / "data" / "compare-log.json"
UA = "Mozilla/5.0 (compatible; yu2i-compare/1.0; +http://yu2i.site)"
TAG = re.compile(r"<[^>]+>")
CJK = re.compile(r"[\u4e00-\u9fff]")

SIGNALS = {
    "toc": r"toc|table of contents|目录",
    "progress": r"reading-progress|scroll-progress|progress-bar",
    "dark-mode": r"prefers-color-scheme|data-theme|dark-mode",
    "reading-time": r"reading time|阅读时长|分钟读完|min read",
    "comments": r"comment|评论",
    "series": r"series|系列|合集",
    "footnotes": r"footnote|脚注|参考文献",
    "captions": r"figcaption|caption",
    "related": r"related|相关文章",
    "breadcrumbs": r"breadcrumb",
    "search": r"type=\"search\"|search-icon|搜索",
    "rss": r"application/rss\+xml|atom\+xml",
    "share": r"share|分享",
    "tags": r"class=\"tags|post-tags|标签",
}


def get(url: str, timeout: int = 12) -> tuple[int, str, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.headers.get("Content-Type", ""), r.read(500_000).decode("utf-8", "replace")
    except Exception:
        return 0, "", ""


def signals_of(html: str) -> list[str]:
    return [k for k, pat in SIGNALS.items() if re.search(pat, html, re.I)]


def metrics(html: str) -> dict:
    text = re.sub(r"\s+", " ", TAG.sub(" ", html))
    return {
        "bytes": len(html),
        "chars": len(text),
        "h1": len(re.findall(r"<h1", html, re.I)),
        "images": len(re.findall(r"<img", html, re.I)),
        "stylesheets": len(re.findall(r"<link[^>]+stylesheet", html, re.I)),
        "scripts": len(re.findall(r"<script", html, re.I)),
        "inline_styles": len(re.findall(r"style=\"", html)),
        "fonts": len(set(re.findall(r"font-family:\s*([^;\"']+)", html))),
        "nav_links": len(re.findall(r"<nav", html, re.I)),
        "dark": bool(re.search(r"prefers-color-scheme|data-theme", html, re.I)),
        "signals": signals_of(html),
    }


def candidates() -> list[dict]:
    out = []
    code, _, body = get("https://bo.ke/api/blogs", timeout=15)
    if code == 200:
        try:
            for b in json.loads(body):
                if b.get("link", "").startswith("https://"):
                    out.append({
                        "name": b.get("name") or "",
                        "url": b["link"],
                        "post": (b.get("latest_post") or {}).get("url"),
                        "source": "博客大联盟",
                        "tags": [t.get("name", "") for t in b.get("tags", []) if t.get("name")][:3],
                    })
        except Exception:
            pass
    for _ in range(2):
        code, _, body = get("https://api.travellings.cn/random", timeout=10)
        if code == 200:
            try:
                for d in json.loads(body).get("data") or []:
                    if d.get("url", "").startswith("http"):
                        out.append({"name": d.get("name") or "", "url": d["url"], "post": None, "source": "开往", "tags": []})
            except Exception:
                pass
    random.shuffle(out)
    return out


def main() -> None:
    history = []
    if HISTORY.exists():
        try:
            history = json.loads(HISTORY.read_text(encoding="utf-8"))
        except Exception:
            history = []
    seen = {h["url"].rstrip("/") for h in history}

    chosen = None
    for c in candidates():
        u = c["url"].rstrip("/")
        if u in seen:
            continue
        code, ctype, html = get(u)
        if code != 200 or "html" not in ctype.lower() or len(html) < 500:
            continue
        if len(CJK.findall(html)) < 40:
            continue
        if re.search(r"色情|博彩|赌博|私服|刷单|porn|casino", html, re.I):
            continue
        chosen = c
        chosen["home_metrics"] = metrics(html)
        chosen["post_url"] = c.get("post")
        chosen["post_signals"] = []
        if chosen["post_url"]:
            pcode, ptype, phtml = get(chosen["post_url"])
            if pcode == 200:
                chosen["post_signals"] = signals_of(phtml)
                chosen["post_metrics"] = metrics(phtml)
        break

    if not chosen:
        print(json.dumps({"candidate": None, "reason": "no reachable unseen site"}, ensure_ascii=False))
        return

    own_html = "".join(
        f.read_text(encoding="utf-8", errors="replace")
        for f in list(ROOT.rglob("*.html"))
        if f.parts[0] != "tools"
    )
    own_css = (ROOT / "assets" / "site.css").read_text(encoding="utf-8")

    own = {
        "bytes_home": (ROOT / "index.html").stat().st_size,
        "css_bytes": len(own_css),
        "js_bytes": (ROOT / "assets" / "site.js").stat().st_size,
        "pages": len([f for f in ROOT.rglob("*.html") if f.parts[0] != "tools"]),
        "signals": signals_of(own_html),
        "external_scripts": len(re.findall(r"<script[^>]+src=\"http", own_html)),
    }

    their_signals = set(chosen["home_metrics"]["signals"]) | set(chosen.get("post_signals", []))
    gaps = sorted(their_signals - set(own["signals"]))

    history.append({"date": date.today().isoformat(), "url": chosen["url"], "gaps": gaps})
    HISTORY.parent.mkdir(exist_ok=True)
    HISTORY.write_text(json.dumps(history[-40:], ensure_ascii=False, indent=1), encoding="utf-8")

    print(json.dumps({
        "candidate": {k: chosen[k] for k in ("name", "url", "post_url", "source", "tags")},
        "their": chosen["home_metrics"],
        "their_post": chosen.get("post_metrics", {}),
        "their_signals": sorted(their_signals),
        "ours": own,
        "gaps": gaps,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
