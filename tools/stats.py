#!/usr/bin/env python3
"""Render stats.html from logs/access.log. Stdlib only.

Only public requests are counted: 127.0.0.1 and RFC1918 addresses are the
site's own health checks and screenshots, not readers.

    python3 tools/stats.py
"""
from __future__ import annotations

import html
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG = ROOT / "logs" / "access.log"
TPL = ROOT / "tools" / "stats.tpl.html"
OUT = ROOT / "stats.html"

LINE = re.compile(
    r'^(?P<ts>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}) (?P<ip>[0-9a-fA-F.:]+) "(?P<method>\w+) (?P<path>.+?)" '
    r'(?P<status>\d{3}) (?P<size>\d+) UA="(?P<ua>.*)"$'
)


def is_local(ip: str) -> bool:
    if ip in ("127.0.0.1", "::1", "localhost"):
        return True
    if ip.startswith(("10.", "172.17.", "172.18.", "172.19.", "172.20.", "192.168.")):
        return True
    return False


def human(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024 ** 2:
        return f"{n / 1024:.1f} KB"
    return f"{n / 1024 ** 2:.2f} MB"


def bars(pairs: list[tuple[str, int]], limit: int = 8, muted: bool = False) -> str:
    if not pairs:
        return '<p class="note-line">还没有数据。</p>'
    top = pairs[:limit]
    peak = max(v for _, v in top) or 1
    out = []
    for label, value in top:
        pct = max(2.0, value / peak * 100)
        cls = "bar bar--muted" if muted else "bar"
        out.append(
            f'<div class="{cls}"><span>{html.escape(label)}</span>'
            f'<span class="bar__track"><span class="bar__fill" style="width:{pct:.1f}%"></span></span>'
            f'<span class="bar__n">{value}</span></div>'
        )
    return "\n".join(out)


def rotate_if_needed() -> None:
    """Keep the log bounded; gzip the old chunk, never delete it."""
    if not LOG.exists() or LOG.stat().st_size < 5_000_000:
        return
    gz = LOG.with_name("access.log.1.gz")
    import gzip
    with gzip.open(gz, "wb") as f:
        f.write(LOG.read_bytes())
    LOG.write_text("", encoding="utf-8")


def main() -> None:
    rotate_if_needed()
    rows = []
    if LOG.exists():
        for line in LOG.read_text(encoding="utf-8", errors="replace").splitlines():
            m = LINE.match(line)
            if m and not is_local(m.group("ip")):
                rows.append(m.groupdict())

    total = len(rows)
    ips = {r["ip"] for r in rows}
    size = sum(int(r["size"]) for r in rows)
    statuses = Counter(r["status"] for r in rows)
    paths = Counter(r["path"].split("?")[0] for r in rows)
    days = Counter(r["ts"][:10] for r in rows)
    hours = Counter(r["ts"][11:13] for r in rows)
    since = min((r["ts"] for r in rows), default="—")

    day_pairs = sorted(days.items(), reverse=True)[:7]
    hour_pairs = [(f"{h}:00", v) for h, v in sorted(hours.items())]
    status_pairs = [(f"HTTP {k}", v) for k, v in statuses.most_common()]
    ua_pairs = Counter(r["ua"][:48] or "—" for r in rows).most_common(5)

    values = {
        "UPDATED": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "TOTAL": f"{total}",
        "IPS": f"{len(ips)}",
        "SIZE": human(size),
        "NOTFOUND": f"{statuses.get('404', 0)}",
        "SINCE": since.replace("T", " ")[:16],
        "TOP_PATHS": bars(paths.most_common()),
        "STATUS": bars(status_pairs, muted=True),
        "DAYS": bars(day_pairs),
        "HOURS": bars(hour_pairs, limit=24, muted=True),
        "UA": bars(ua_pairs, muted=True),
    }

    tpl = TPL.read_text(encoding="utf-8")
    for key, val in values.items():
        tpl = tpl.replace("{{" + key + "}}", val)
    OUT.write_text(tpl, encoding="utf-8")
    print(f"stats.html: {total} public requests from {len(ips)} IPs, {human(size)}")


if __name__ == "__main__":
    main()
