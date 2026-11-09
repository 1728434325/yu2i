#!/usr/bin/env bash
# Turn the already-logged-in Cloudflare account into a working tunnel for yu2i.site.
# Prereq: `cloudflared tunnel login` has been run by the user, and yu2i.site's
# nameservers now point at Cloudflare.
set -euo pipefail

BIN=/home/xyz/.local/bin/cloudflared
CFG=/home/xyz/.cloudflared/config.yml
NAME=yu2i
HOST=yu2i.site

if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
  echo "缺少 cert.pem：先运行  $BIN tunnel login  并把打印出的网址在浏览器里打开授权。" >&2
  exit 1
fi

tid() { "$BIN" tunnel list --output json | python3 -c '
import json,sys
for t in json.load(sys.stdin):
    if t.get("name") == "'"$NAME"'": print(t["id"]); break
'; }

ID="$(tid || true)"
if [ -z "${ID:-}" ]; then
  "$BIN" tunnel create "$NAME"
  ID="$(tid)"
fi

cat > "$CFG" <<EOF
tunnel: $ID
credentials-file: /home/xyz/.cloudflared/$ID.json
ingress:
  - hostname: $HOST
    service: http://127.0.0.1:2778
  - service: http_status:404
EOF

"$BIN" tunnel route dns "$NAME" "$HOST" || echo "(DNS 记录可能已存在，继续)"

if pgrep -f "cloudflared tunnel --config $CFG run" >/dev/null 2>&1; then
  echo "隧道已在运行"
else
  setsid nohup "$BIN" tunnel --config "$CFG" run "$NAME" > /home/xyz/sites/yu2i/logs/tunnel.out 2>&1 &
  sleep 3
fi

curl -s -o /dev/null -w 'https://%{url_effective} -> %{http_code}\n' "https://$HOST/" || true
