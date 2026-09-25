# 인수인계: DB 마이그레이션 작업

**작성** 2026-09-25 · **넘기는 쪽** 로컬 PC 세션 → **받는 쪽** 서버(`~/eventory`) 세션
**목표** 아직 적용되지 않은 스키마 변경 5건을 운영 DB에 반영하고 검증한다.

---

## 0. 30초 요약

- 코드는 **전부 완료·배포됨**. 남은 건 **SQL 실행 하나**.
- SQL은 **이미 검증됐다** — 메모리 Postgres에서 81건 통과.
- 막힌 이유: **DB 접속 주소(비밀번호 포함)가 없다.** 사람만 가져올 수 있다.
- ⚠️ **반드시 풀러(pooler) 주소를 써야 한다.** 직접접속 주소는 IPv6 전용인데 이 서버엔 IPv6가 없다.

---

## 1. 현재 상태

### 적용 안 된 것 (`npm run check:schema` 로 확인 가능)

| 종류 | 대상 |
|---|---|
| 없는 표 | `audit_log`, `settlements` |
| 없는 컬럼 | `inquiries.privacy_agreed_at`, `inquiries.privacy_version`, `schedules.vendor_id` |

### 코드는 이미 이 상태를 견디도록 짜여 있다

표·컬럼이 없어도 **사이트는 정상 동작한다.** 없으면 조용히 건너뛰고 기존 경로로 처리한다.

| 코드 | 없을 때 동작 |
|---|---|
| `lib/admin/audit.js` | 이력 기록만 건너뜀. 본래 작업은 그대로 성공 |
| `lib/admin/settlements.js` | `inquiries`의 기존 정산 컬럼으로 읽고 쓴다 |
| `components/QuoteForm.js` | 동의 시각 없이 문의만 저장 |
| `syncVendorId()` (schedule/actions.js) | 아무 일도 하지 않음 |

즉 **급하지 않다.** 서두르다 망치는 것보다 천천히 정확히 하는 게 낫다.

---

## 2. 막힌 지점과 푸는 법

DDL(표 생성·컬럼 추가)은 **PostgREST로 불가능하다.** `service_role` 키로도 안 된다.
확인 완료: `exec_sql`, `execute_sql`, `sql`, `query` RPC 전부 404.

### 필요한 것: `SUPABASE_DB_URL`

사람이 Supabase 대시보드에서 가져와야 한다. AI는 가져올 수 없다.

```
Project Settings → Database → Connection string
```

### ⚠️ 어느 주소를 쓸 것인가 — 이게 핵심

| 종류 | 주소 형태 | 이 서버에서 |
|---|---|---|
| 직접접속 | `db.<ref>.supabase.co:5432` | ❌ **불가** — IPv6 전용인데 서버에 IPv6 없음 |
| **세션 풀러** | `aws-0-<region>.pooler.supabase.com:5432` | ✅ **이걸 써야 함** (IPv4) |
| 트랜잭션 풀러 | `...pooler.supabase.com:6543` | ❌ DDL 미지원 |

확인된 사실 (2026-09-25):
```
db.yonavvwvfitdhcxzmhjj.supabase.co → IPv6(2406:da12:...) 만 있음, IPv4 없음
서버 global IPv6 → 없음
```

로컬 PC도 IPv4만이면 마찬가지다. **의심되면 풀러를 쓰면 된다.**

---

## 3. 실행 절차

### 3-1. 사전 준비 (서버에서 1회)

```bash
cd ~/eventory
git pull --ff-only origin main
npm install          # pg 모듈(개발 의존성)이 서버에 없다
```

### 3-2. 접속 주소 저장

사람에게 풀러 URI를 받아서 `.env.local` 에 추가한다.
**절대 대화에 붙여넣게 하지 말 것.** 파일에 직접 넣는다.

```bash
# 사람이 직접 실행 (입력이 화면에 안 보임)
cd ~/eventory
read -s -p "풀러 URI 붙여넣고 Enter: " V && printf '\nSUPABASE_DB_URL=%s\n' "$V" >> .env.local && unset V && echo 저장됨
```

형식 확인: `postgresql://postgres.<ref>:<비밀번호>@aws-0-....pooler.supabase.com:5432/postgres`

### 3-3. 미리보기 → 실행

```bash
npm run db:apply            # 무엇이 적용될지만 출력
npm run db:apply -- --run   # 실제 적용
```

`--run` 이 하는 일:
1. **백업 먼저** (`~/backups/eventory/YYYY-MM-DD/`). 백업 실패 시 **중단**한다.
2. 마이그레이션 5개를 알파벳순으로 적용
3. 스키마 대조 출력

### 3-4. 검증

```bash
npm run check:schema        # "✅ 파일과 DB가 일치합니다." 가 나와야 함
npm run check               # 남은 임시값도 함께 확인
```

데이터 확인:
```bash
node -e '
const fs=require("fs");const e=fs.readFileSync(".env.local","utf8");
const g=k=>{const m=e.match(new RegExp("^"+k+"=(.*)$","m"));return m?m[1].trim():null};
const {createClient}=require("@supabase/supabase-js");
const db=createClient(g("NEXT_PUBLIC_SUPABASE_URL"),g("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false}});
(async()=>{
  const s=(await db.from("settlements").select("id")).data?.length;
  const v=(await db.from("schedules").select("id").not("vendor","is",null).is("vendor_id",null)).data?.length;
  console.log("정산 복사:",s,"건 (13건 예상)");
  console.log("거래처 미연결 일정:",v,"건 (0 이어야 정상)");
})();'
```

### 3-5. 화면 확인

```bash
curl -s -o /dev/null -w "매출관리 %{http_code}\n" http://127.0.0.1:3001/admin/stats
```

관리자로 로그인해 **매출 관리**에서 합계가 기존과 같은지 본다.
적용 전 기준값: **계약 8건 ₩9,850,000 / 실입금 4건 ₩4,455,000**

---

## 4. 무엇이 바뀌나

| 파일 | 내용 | 위험 |
|---|---|---|
| `20260924-audit-log.sql` | `audit_log` 표 생성 | 없음 (신규) |
| `20260924-constraints.sql` | 금액·상태·날짜·단계·수량 제약 11개 | 낮음 — 위반 데이터 0건 확인함 |
| `20260924-privacy-consent.sql` | 동의 시각·버전 컬럼 | 없음 (신규) |
| `20260924-settlements.sql` | `settlements` 표 + 데이터 **복사** | 낮음 — 원본은 그대로 둔다 |
| `20260924-vendor-fk.sql` | `vendor_id` 컬럼 + 거래처 자동 등록 | 낮음 — `아무개디자인`이 거래처로 추가됨 |

**데이터를 지우는 구문은 0건이다.** (`delete`/`truncate`/`drop table`/`drop column` 전부 없음)
`drop function _add_check(...)` 한 줄이 있는데, 제약을 걸려고 파일 안에서 만든 임시 함수를 치우는 것이다.
Supabase SQL Editor가 이 한 줄 때문에 "destructive" 경고를 띄운다. 정상이다.

---

## 5. 이미 검증된 근거

```bash
npm run smoke      # 81건 통과
```

메모리 위의 진짜 Postgres(PGlite, Apache-2.0)에 `schema.sql` → 표본 데이터 → 마이그레이션을
실제로 적용해 검사한다. 운영 DB를 건드리지 않는다.

검증 항목: 정산 복사 정확성 · 원본 보존 · 문의 삭제 시 연쇄 삭제 · 제약이 실제로 막는지 ·
거래처 고아 데이터 해소 · 이름 변경 시 연결 유지 · 원본 삭제 후에도 이력 잔존 ·
RLS 노출 여부 · **재실행 안전성** · 통합본 동등성

**적용 순서는 알파벳순이며, 스모크 테스트가 정확히 그 순서로 통과했다.**

---

## 6. 문제가 생기면

### 접속이 안 될 때
- `getaddrinfo ENOTFOUND` / 응답 없음 → **직접접속 주소를 쓰고 있다.** 풀러로 바꾼다.
- `password authentication failed` → 비밀번호가 틀렸다. 대시보드에서 Reset database password.
- `Invalid URL` → URI가 아닌 다른 것이 저장됐다. `.env.local`의 `SUPABASE_DB_URL` 줄을 지우고 다시.

### 적용 도중 실패했을 때
전부 `if not exists` / `on conflict do nothing` 이라 **그냥 다시 실행하면 된다.**
중복이 생기지 않는 것을 스모크 테스트에서 확인했다.

### 되돌려야 할 때
```bash
ls ~/backups/eventory/          # 적용 직전 백업이 있다
```
백업은 gzip JSON이다. 표를 통째로 되돌리려면 그 파일을 읽어 다시 넣는다.
단 **제약과 표 추가는 데이터를 해치지 않으므로 되돌릴 일이 거의 없다.**

---

## 7. 하지 말 것

| 금지 | 이유 |
|---|---|
| `~/stock-app` 건드리기 | **somtip.kr 운영 코드.** 멈추면 다른 사업이 선다 |
| `pm2 restart all` | somtip 도 같이 재시작된다. `pm2 restart eventory` 만 |
| `.env.local` 을 git에 커밋 | 키가 유출된다 (`.gitignore`에 있으니 억지로 add하지 말 것) |
| 접속 주소·키를 대화에 출력 | 기록에 남는다. 파일로만 다룬다 |
| 백업 없이 SQL 실행 | `db:apply` 가 자동으로 하지만, 손으로 돌릴 땐 직접 챙긴다 |
| `inquiries` 의 정산 컬럼 삭제 | 아직 이관 중이다. 최소 한 달 관찰 후 |

---

## 8. 끝난 뒤 알릴 것

사람에게 이렇게 보고한다.

- `npm run check:schema` 결과 (일치하는지)
- 정산 복사 건수 / 거래처 미연결 건수
- 매출 관리 화면 합계가 기존과 같은지
- 백업 경로

그 다음 남은 일은 [`BACKEND.md`](BACKEND.md) 8절 참고.
요약: 처리방침 실제 정보 5개 · HTTPS(도메인 필요) · 개발 DB 분리.

---

## 9. 참고 파일

| 경로 | 내용 |
|---|---|
| `supabase/migrations/APPLY-ALL-20260924.sql` | 5개를 순서대로 묶은 통합본 |
| `supabase/migrations/*.sql` | 개별 파일 |
| `scripts/db-apply.mjs` | 적용 도구 (백업·대조 포함) |
| `scripts/check-schema.mjs` | 파일 ↔ DB 대조 |
| `scripts/smoke/` | 검증 (모듈별) |
| `docs/DATABASE.md` | 표 명세·정규화 상태 |
| `docs/BACKEND.md` | 운영 절차 전반 |
