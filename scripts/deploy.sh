#!/usr/bin/env bash
# 이벤트랜드 배포
#
#   bash scripts/deploy.sh
#
# 그냥 git pull 만 하면 서버의 package-lock.json 이 npm 때문에 바뀌어 있어
# --ff-only 가 막히고, "빌드했다"고 착각한 채 옛 코드가 그대로 도는 일이 있었다.
# 이 스크립트는 그 상황을 정리하고, 실제로 갱신됐는지 확인한 뒤 재시작한다.
set -euo pipefail

KEY="${EVENTLAND_SSH_KEY:-/c/Users/LEE/Desktop/somtip/ssh/ssh-key-2026-06-04.key}"
HOST="${EVENTLAND_HOST:-ubuntu@134.185.108.37}"
BASE="${EVENTLAND_URL:-http://134.185.108.37}"

want=$(git rev-parse --short HEAD)
echo "배포할 버전: $want"

ssh -o StrictHostKeyChecking=no -o ConnectTimeout=25 -i "$KEY" "$HOST" "
set -e
cd ~/eventory

# npm 이 건드린 lock 파일 등 로컬 변경을 버린다 (서버는 읽기 전용으로 쓴다)
git checkout -- . 2>/dev/null || true
git pull --ff-only origin main

got=\$(git rev-parse --short HEAD)
if [ \"\$got\" != \"$want\" ]; then
  echo \"중단: 서버가 \$got, 기대한 것은 $want\"
  exit 1
fi

npm run build
pm2 restart eventory >/dev/null 2>&1

# Next 가 실제로 응답할 때까지 기다린다 (재시작 직후엔 502 가 난다)
for i in \$(seq 1 40); do
  c=\$(curl -s -m 8 -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/ || true)
  [ \"\$c\" = '200' ] && break
  sleep 1
done
"

echo
echo "확인"
fail=0
for p in / /contact /privacy /admin; do
  c=$(curl -s -m 20 -o /dev/null -w "%{http_code}" "$BASE$p" || echo "000")
  printf "  %-10s %s\n" "$p" "$c"
  [ "$c" = "200" ] || fail=1
done
# 같은 서버의 다른 사이트가 영향받지 않았는지
c=$(curl -s -m 15 -o /dev/null -w "%{http_code}" https://somtip.kr/ || echo "000")
printf "  %-10s %s  (같은 서버, 영향 없어야 함)\n" "somtip.kr" "$c"
[ "$c" = "200" ] || fail=1

if [ "$fail" = "0" ]; then echo; echo "배포 완료: $want"; else echo; echo "확인 실패 — 위 상태 코드를 보세요"; exit 1; fi
