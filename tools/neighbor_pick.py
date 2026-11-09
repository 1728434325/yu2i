#!/usr/bin/env python3
"""Discovery half of the hourly neighbors job. Stdlib only, read-only on the web.

Pulls a few candidate blogs from public Chinese-blog directories, checks
they are reachable and plausible, appends new ones to data/neighbors.json,
renders the page, and prints a small JSON summary for the agent to turn
into one inspiration note.

    python3 tools/neighbor_pick.py --max 2
"""
from __future__ import annotations

import argparse
import json
import random
import re
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "neighbors.json"
UA = "Mozilla/5.0 (compatible; yu2i-neighbor/1.0; +http://yu2i.site)"
BAD_WORDS = ("色情", "博彩", "赌博", "私服", "代购", "刷单", "兼职", "加群", "porn", "casino", "viagra")
CJK = re.compile(r"[\u4e00-\u9fff]")
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.S | re.I)
TAG_RE = re.compile(r"<[^>]+>")


def get(url: str, timeout: int = 8) -> tuple[int, str, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read(400_000)
            return r.status, r.headers.get("Content-Type", ""), body.decode("utf-8", "replace")
    except Exception:
        return 0, "", ""


def from_boke() -> list[dict]:
    code, _, body = get("https://bo.ke/api/blogs", timeout=15)
    if code != 200:
        return []
    try:
        items = json.loads(body)
    except Exception:
        return []
    out = []
    for b in random.sample(items, min(len(items), 120)):
        if not b.get("link", "").startswith("https://"):
            continue
        out.append({
            "name": b.get("name") or "",
            "url": b["link"],
            "tags": [t.get("name", "") for t in b.get("tags", []) if t.get("name")][:3],
            "source": "博客大联盟",
            "latest": (b.get("latest_post") or {}).get("url"),
        })
    return out


def from_travellings(n: int = 3) -> list[dict]:
    out = []
    for _ in range(n):
        code, _, body = get("https://api.travellings.cn/random", timeout=10)
        if code != 200:
            continue
        try:
            data = json.loads(body).get("data") or []
        except Exception:
            continue
        if data and data[0].get("url", "").startswith("http"):
            out.append({
                "name": data[0].get("name") or "",
                "url": data[0]["url"],
                "tags": ["开往"],
                "source": "开往",
            })
    return out


def load() -> list[dict]:
    if DATA.exists():
        try:
            return json.loads(DATA.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max", type=int, default=2)
    args = ap.parse_args()

    items = load()
    seen = {i.get("url", "").rstrip("/") for i in items}

    candidates = from_boke() + from_travellings()
    new: list[dict] = []
    samples: list[dict] = []
    checked = 0

    for c in candidates:
        if len(new) >= args.max or checked >= 8:
            break
        u = c["url"].rstrip("/")
        if not u or u in seen:
            continue
        if any(w in (c.get("name", "") + u).lower() for w in BAD_WORDS):
            continue
        checked += 1
        code, ctype, body = get(u)
        if code != 200 or "html" not in ctype.lower():
            continue
        if len(body) < 400 or len(CJK.findall(body)) < 40:
            continue
        title = TAG_RE.sub("", TITLE_RE.search(body).group(1)).strip() if TITLE_RE.search(body) else c["name"]
        if any(w in body.lower() for w in BAD_WORDS):
            continue
        entry = {
            "name": (c["name"] or title or u.split("//")[-1])[:40],
            "url": u + "/",
            "tags": c["tags"][:2],
            "source": c["source"],
            "added": date.today().isoformat(),
        }
        new.append(entry)
        seen.add(u)
        text = re.sub(r"\s+", " ", TAG_RE.sub(" ", body))
        sample = {"url": u, "title": title[:80], "excerpt": text[:300], "signals": []}

        post_url = c.get("latest")
        if post_url:
            pcode, ptype, pbody = get(post_url)
            if pcode == 200 and "html" in ptype.lower():
                signals = []
                checks = {
                    "toc": r"toc|table of contents|目录",
                    "progress": r"reading-progress|scroll-progress|progress-bar",
                    "dark-mode": r"prefers-color-scheme|data-theme|dark-mode|darkmode",
                    "reading-time": r"reading time|阅读时长|分钟读完",
                    "comments": r"comment|评论",
                    "series": r"series|系列|合集",
                    "footnotes": r"footnote|脚注|参考文献",
                    "captions": r"figcaption|caption",
                    "related": r"related|相关文章",
                    "breadcrumbs": r"breadcrumb",
                }
                for name, pat in checks.items():
                    if re.search(pat, pbody, re.I):
                        signals.append(name)
                sample["post_url"] = post_url
                sample["signals"] = signals
                sample["post_excerpt"] = re.sub(r"\s+", " ", TAG_RE.sub(" ", pbody))[:400]

        samples.append(sample)

    if new:
        items.extend(new)
        DATA.parent.mkdir(exist_ok=True)
        DATA.write_text(json.dumps(items[-60:], ensure_ascii=False, indent=1), encoding="utf-8")
        import subprocess
        subprocess.run(["python3", str(ROOT / "tools" / "neighbors.py")], check=False)

    # what the site already does, so the agent doesn't propose it again
    checks = {
        "toc": r"toc|table of contents|目录",
        "progress": r"reading-progress|scroll-progress|progress-bar",
        "dark-mode": r"prefers-color-scheme|data-theme|dark-mode|darkmode",
        "reading-time": r"reading time|阅读时长|分钟读完",
        "comments": r"comment|评论",
        "series": r"series|系列|合集",
        "footnotes": r"footnote|脚注|参考文献",
        "captions": r"figcaption|caption",
        "related": r"related|相关文章",
        "breadcrumbs": r"breadcrumb",
    }
    own = ""
    for f in list(ROOT.rglob("*.html")) + [ROOT / "assets" / "site.css"]:
        if f.parts[0] == "tools":
            continue
        try:
            own += f.read_text(encoding="utf-8", errors="replace")
        except Exception:
            pass
    have = [k for k, pat in checks.items() if re.search(pat, own, re.I)]

    print(json.dumps({
        "added": new,
        "total": len(items),
        "checked": checked,
        "samples": samples,
        "have": have,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
