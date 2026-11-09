#!/usr/bin/env bash
# Switch the site's absolute base URL in one command.
#
#   tools/set_host.sh http://175.178.200.224:2778     # IP only, before DNS/备案
#   tools/set_host.sh https://yu2i.site               # after Cloudflare is active
#
# Rewrites every absolute reference in html/xml/json under the site root.
# Links inside pages are already relative, so this only touches canonical,
# og:*, sitemap, feed and the sitemap URL in robots.txt.
set -euo pipefail
cd "$(dirname "$0")/.."

NEW="${1:?用法: tools/set_host.sh <scheme://host[:port]>}"
NEW="${NEW%/}"

python3 - "$NEW" <<'PY'
import re, sys
from pathlib import Path

new = sys.argv[1]
pat = re.compile(r'https?://(?:[a-z0-9.-]+|\[[0-9a-f:]+\])(?::\d+)?(?=[/"<\s])', re.I)
current = []

files = [p for p in Path('.').rglob('*')
         if p.is_file() and p.suffix in {'.html', '.xml', '.json', '.txt'}
         and not p.parts[0] in {'logs', 'tools'} and p.name != 'README.md']

for p in files:
    s = p.read_text(encoding='utf-8', errors='replace')
    m = re.search(r'https?://(?:yu2i\.site|175\.178\.200\.224)(?::\d+)?', s)
    if not m:
        continue
    base = m.group(0)
    current.append(base)
    s2 = s.replace(base, new)
    if s2 != s:
        p.write_text(s2, encoding='utf-8')
        print(f'{p}: {base} -> {new}')

print(f'replaced {len(set(current))} base(s): {", ".join(sorted(set(current)))}')
PY

if [ -f robots.txt ]; then
  sed -i "s|Sitemap: .*|Sitemap: ${NEW}/sitemap.xml|" robots.txt
fi
grep -h 'rel="canonical"' index.html | head -1
echo "done: ${NEW}/"
