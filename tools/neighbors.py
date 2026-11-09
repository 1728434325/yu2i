#!/usr/bin/env python3
"""Render neighbors/index.html from data/neighbors.json. Stdlib only.

The hourly cron job appends discovered blogs to the JSON; this script
turns that file into a static page. Never edit the HTML by hand.
"""
from __future__ import annotations

import html
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "neighbors.json"
TPL = ROOT / "tools" / "neighbors.tpl.html"
OUT = ROOT / "neighbors" / "index.html"


def esc(s: str) -> str:
    return html.escape(str(s), quote=True)


def main() -> None:
    items = json.loads(DATA.read_text(encoding="utf-8")) if DATA.exists() else []
    items = sorted(items, key=lambda x: x.get("added", ""), reverse=True)[:60]

    rows = []
    for it in items:
        tags = "".join(f"<span>{esc(t)}</span>" for t in it.get("tags", [])[:4])
        host = it["url"].split("//", 1)[-1].split("/", 1)[0]
        rows.append(
            f'<li class="nbr">'
            f'<a class="nbr__name" href="{esc(it["url"])}" rel="noopener nofollow" target="_blank">{esc(it["name"])}</a>'
            f'<span class="nbr__host">{esc(host)}</span>'
            f'<span class="nbr__tags">{tags}</span>'
            f'<span class="nbr__date">{esc(it.get("added", "")[5:])}</span>'
            f"</li>"
        )

    body = "\n".join(rows) if rows else '<li class="nbr nbr--empty">还没有收集到条目。</li>'
    tpl = TPL.read_text(encoding="utf-8")
    tpl = tpl.replace("{{ROWS}}", body)
    tpl = tpl.replace("{{COUNT}}", str(len(items)))
    tpl = tpl.replace("{{UPDATED}}", date.today().isoformat())
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(tpl, encoding="utf-8")
    print(f"neighbors: {len(items)} entries -> {OUT}")


if __name__ == "__main__":
    main()
