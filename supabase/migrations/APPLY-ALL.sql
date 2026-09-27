-- =====================================================================
--  이벤트랜드 — 스키마 변경 통합본
--  자동 생성: npm run build:sql  (2026-09-27)
--
--  사용법
--    1) Supabase 대시보드 → SQL Editor
--    2) 이 파일 전체를 붙여넣고 Run
--    3) 끝나면 로컬에서  npm run check:schema
--
--  모두 여러 번 실행해도 안전하다.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────
--   1. 변경 이력 · 개인정보 조회 기록 테이블
--      (20260924-audit-log.sql)
-- ─────────────────────────────────────────────────────────────────

-- 변경 이력 · 개인정보 조회 기록 테이블
--
-- 배경
--  1) 재고·단가·거래처·홈페이지 관리에는 변경 이력이 전혀 없었다.
--     (견적·일정·매출만 inquiries.activity_log 에 기록 중)
--  2) 개인정보 안전성 확보조치 기준 제8조 —
--     개인정보 취급자의 접속(조회) 기록을 1년 이상 보관해야 한다.
--
-- 이력을 문의 행 안(jsonb)이 아니라 별도 테이블에 두는 이유:
--  원본을 삭제해도 "누가 지웠는지"가 남아야 하기 때문.

create table if not exists audit_log (
  id           bigserial primary key,
  at           timestamptz not null default now(),
  actor        text,        -- 누가 (이름 또는 로그인 아이디)
  actor_id     uuid,        -- 계정 id
  section      text,        -- 어느 메뉴 (rates / inventory / vendors / inquiries ...)
  action       text,        -- 무엇을 (create / update / delete / view_personal)
  target_table text,        -- 대상 테이블
  target_id    text,        -- 대상 행 id
  detail       jsonb,       -- 변경 내용 요약
  ip           text         -- 접속 IP (nginx X-Forwarded-For)
);

alter table audit_log enable row level security;  -- 정책 없음 → service_role(관리자 서버)만 접근

create index if not exists idx_audit_at      on audit_log (at desc);
create index if not exists idx_audit_actor   on audit_log (actor, at desc);
create index if not exists idx_audit_section on audit_log (section, at desc);
create index if not exists idx_audit_target  on audit_log (target_table, target_id);

comment on table audit_log is '관리자 변경 이력 및 개인정보 조회 기록. 법정 보관기간 1년 이상.';

-- ─────────────────────────────────────────────────────────────────
--   2. 데이터 무결성 제약 보강
--      (20260924-constraints.sql)
-- ─────────────────────────────────────────────────────────────────

-- 데이터 무결성 제약 보강
--
-- 앱 코드에 버그가 있어도 DB가 막아주도록 "깨지면 안 되는 규칙"을 SQL로 내린다.
-- 적용 전 실제 데이터를 검사해 위반 0건임을 확인했다 (2026-09-24).
--
-- 주의: 사람이 입력하는 값(담당자명·연락처 등)에는 NOT NULL 을 걸지 않았다.
--       관리자가 전화로 받은 문의를 부분 정보만으로 먼저 등록할 수 있어야 한다.

-- 제약은 add constraint if not exists 문법이 없어 DO 블록으로 감싼다
create or replace function _add_check(tbl text, cname text, expr text)
returns void language plpgsql as $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = cname and conrelid = tbl::regclass
  ) then
    execute format('alter table %I add constraint %I check (%s)', tbl, cname, expr);
  end if;
end $$;

-- 금액은 음수가 될 수 없다
select _add_check('inquiries', 'chk_inq_contract_nonneg', 'contract_amount is null or contract_amount >= 0');
select _add_check('inquiries', 'chk_inq_quoted_nonneg',   'quoted_amount   is null or quoted_amount   >= 0');
select _add_check('inquiries', 'chk_inq_paid_nonneg',     'paid_amount     is null or paid_amount     >= 0');

-- 진행 상태는 정해진 값만
select _add_check('inquiries', 'chk_inq_status',
  $q$status is null or status in ('new','consulting','quoted','confirmed','done','cancelled')$q$);

-- 행사 종료일이 시작일보다 앞설 수 없다
select _add_check('schedules', 'chk_sch_date_order',
  'end_date is null or end_date >= start_date');
select _add_check('schedules', 'chk_sch_event_date_order',
  'event_end is null or event_start is null or event_end >= event_start');

-- 진행 단계는 0~4 (0=시작전, 1=출력물 발주, 2=랩핑, 3=출고, 4=회수)
select _add_check('schedules', 'chk_sch_stage_range', 'stage is null or (stage >= 0 and stage <= 4)');

-- 배정 수량은 1 이상
select _add_check('schedule_items', 'chk_si_quantity', 'quantity >= 1');

-- 단가는 음수가 될 수 없다
select _add_check('shipping_rates', 'chk_ship_quick_nonneg',  'quick_fee  is null or quick_fee  >= 0');
select _add_check('shipping_rates', 'chk_ship_direct_nonneg', 'direct_fee is null or direct_fee >= 0');
select _add_check('rental_rates',   'chk_rental_made_nonneg', 'made_price is null or made_price >= 0');

drop function _add_check(text, text, text);

-- 확인용
--   select conname, conrelid::regclass as tbl
--   from pg_constraint where conname like 'chk_%' order by 2, 1;

-- ─────────────────────────────────────────────────────────────────
--   3. 개인정보 수집·이용 동의 기록 (개인정보보호법 제15조 — 동의 사실 입증용)
--      (20260924-privacy-consent.sql)
-- ─────────────────────────────────────────────────────────────────

-- 개인정보 수집·이용 동의 기록 (개인정보보호법 제15조 — 동의 사실 입증용)
--
-- 견적 문의 폼에서 동의한 시각과 동의문 버전을 함께 저장한다.
-- 이 컬럼이 없어도 폼은 동작하지만(코드에 예비 동작이 있음) 동의 기록이 남지 않는다.

alter table inquiries add column if not exists privacy_agreed_at timestamptz;
alter table inquiries add column if not exists privacy_version text;

comment on column inquiries.privacy_agreed_at is '개인정보 수집·이용에 동의한 시각';
comment on column inquiries.privacy_version is '동의 당시 동의문 버전 (lib/privacy.js PRIVACY_VERSION)';

-- ─────────────────────────────────────────────────────────────────
--   4. 정산 분리 (2차·3차 정규화)
--      (20260924-settlements.sql)
-- ─────────────────────────────────────────────────────────────────

-- 정산 분리 (2차·3차 정규화)
--
-- 배경
--   inquiries 테이블이 컬럼 31개로 다섯 가지 역할을 겸하고 있다.
--   고객정보 · 문의내용 · 진행상태 · 정산(10개) · 이력
--   정산은 성격이 완전히 달라 별도 테이블이 맞다.
--
-- 방침 (안전한 2단계)
--   1단계(이 파일) : settlements 테이블을 만들고 기존 데이터를 복사한다.
--                    inquiries 의 정산 컬럼은 그대로 둔다 → 화면이 계속 동작한다.
--   2단계(코드)    : 화면이 settlements 를 읽고 쓰도록 바꾼다.
--   3단계(나중)    : 한 달 이상 관찰 후 inquiries 의 정산 컬럼을 제거한다.
--
--   ※ 이 파일만 실행해도 기존 화면은 그대로 동작한다.

create table if not exists settlements (
  id              uuid primary key default gen_random_uuid(),
  inquiry_id      uuid not null unique references inquiries(id) on delete cascade,

  quoted_amount   bigint,      -- 견적 공급가액
  contract_amount bigint,      -- 계약 금액
  paid_amount     bigint,      -- 실입금액

  invoice_date    date,        -- 계산서 발행일
  invoice_by      text,        -- 발행 처리자
  invoice_at      timestamptz,

  paid_date       date,        -- 입금일
  paid_by         text,        -- 입금 처리자
  paid_at         timestamptz,

  memo            text,        -- 정산 비고
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table settlements enable row level security;  -- 정책 없음 → service_role 만

create index if not exists idx_settlements_inquiry on settlements (inquiry_id);
create index if not exists idx_settlements_paid    on settlements (paid_date);
create index if not exists idx_settlements_invoice on settlements (invoice_date);

-- 금액 음수 방지
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_settle_nonneg') then
    alter table settlements add constraint chk_settle_nonneg check (
      (quoted_amount   is null or quoted_amount   >= 0) and
      (contract_amount is null or contract_amount >= 0) and
      (paid_amount     is null or paid_amount     >= 0)
    );
  end if;
end $$;

-- 기존 데이터 복사 (정산 흔적이 하나라도 있는 문의만)
insert into settlements (
  inquiry_id, quoted_amount, contract_amount, paid_amount,
  invoice_date, invoice_by, invoice_at,
  paid_date, paid_by, paid_at, memo
)
select
  i.id, i.quoted_amount, i.contract_amount, i.paid_amount,
  i.invoice_date, i.invoice_by, i.invoice_at,
  i.paid_date, i.paid_by, i.paid_at, i.settle_memo
from inquiries i
where (
  i.quoted_amount is not null or i.contract_amount is not null or
  i.paid_amount   is not null or i.invoice_date    is not null or
  i.paid_date     is not null or i.settle_memo     is not null
)
on conflict (inquiry_id) do nothing;

comment on table settlements is '문의별 정산. inquiries 의 정산 컬럼을 대체할 테이블(이관 중).';

-- 확인용 — 복사된 건수가 원본과 같아야 한다
--   select (select count(*) from settlements) as 복사됨,
--          (select count(*) from inquiries
--           where quoted_amount is not null or contract_amount is not null
--              or paid_amount is not null or invoice_date is not null
--              or paid_date is not null or settle_memo is not null) as 원본;

-- ─────────────────────────────────────────────────────────────────
--   5. 거래처 연결 정리 (3차 정규화)
--      (20260924-vendor-fk.sql)
-- ─────────────────────────────────────────────────────────────────

-- 거래처 연결 정리 (3차 정규화)
--
-- 문제
--  schedules.vendor 가 거래처 '이름(text)'으로 저장되어 vendors 테이블과 끊어져 있다.
--  실제로 점검 중 '아무개디자인' 이 vendors 에 없는 고아 데이터로 발견됐다.
--  거래처 이름을 바꾸면 기존 일정은 옛 이름 그대로 남는다.
--
-- 방침
--  기존 vendor(text) 컬럼은 지우지 않고 그대로 둔다. (화면이 아직 쓰는 중)
--  vendor_id 를 새로 만들어 채워두고, 코드 정리가 끝난 뒤 text 컬럼을 정리한다.
--  ※ 컬럼은 한 달 이상 관찰한 뒤 지울 것.

-- 1) 일정에 적혀 있으나 거래처 목록에 없는 이름을 먼저 등록
insert into vendors (name)
select distinct s.vendor
from schedules s
where s.vendor is not null
  and btrim(s.vendor) <> ''
  and not exists (select 1 from vendors v where v.name = s.vendor);

-- 2) 외래키 컬럼 추가 후 이름으로 연결
alter table schedules add column if not exists vendor_id uuid references vendors(id) on delete set null;

update schedules s
set vendor_id = v.id
from vendors v
where s.vendor = v.name
  and s.vendor_id is null;

create index if not exists idx_schedules_vendor on schedules (vendor_id);

comment on column schedules.vendor_id is '거래처 외래키. 기존 vendor(text)를 대체할 컬럼.';
comment on column schedules.vendor is '[정리 예정] 거래처 이름 문자열. vendor_id 로 이관 중.';

-- 3) 확인용 — 연결되지 않은 일정이 남아 있는지
--    select title, vendor from schedules where vendor is not null and vendor_id is null;

-- ─────────────────────────────────────────────────────────────────
--   6. 진행 단계를 4개 → 6개로 확장
--      (20260927-stage-6.sql)
-- ─────────────────────────────────────────────────────────────────

-- 진행 단계를 4개 → 6개로 확장
--
-- 배경
--   실제 업무 순서는 아래와 같은데 시스템엔 4개뿐이었다.
--     AI파일 받기 → 출력물 발주 → 출력물 수령 → 랩핑 → 출고 → 회수
--   'AI파일이 아직 안 왔다'와 '발주했는데 인쇄가 안 왔다'를 표시할 자리가 없어,
--   어디서 막혀 있는지 구분되지 않았다.
--
-- 번호 대응 (단순 +1 이 아니다 — 앞뒤로 하나씩 끼어든다)
--     옛 1 발주 → 새 2 발주      (앞에 AI파일이 1로 들어옴)
--     옛 2 랩핑 → 새 4 랩핑      (중간에 수령이 3으로 들어옴)
--     옛 3 출고 → 새 5 출고
--     옛 4 회수 → 새 6 회수
--   랩핑이 끝났다면 수령도 끝난 것이므로, 옛 2는 새 4로 올려도 의미가 맞다.
--
-- stage_dates / stage_by 는 키가 단계 '번호'라 같은 규칙으로 옮긴다.
-- 그대로 두면 "9/14 발주함" 기록이 "AI파일 받음"으로 읽힌다.
--
-- 여러 번 실행해도 안전하도록 schema_migrations 로 1회만 수행한다.

-- 적용한 데이터 이전을 기록하는 표 (앞으로의 데이터 이전에도 쓴다)
create table if not exists schema_migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);
alter table schema_migrations enable row level security;  -- service_role 전용

comment on table schema_migrations is '적용 완료된 데이터 이전 기록. 재실행 방지용.';

-- 옛 제약(0~4)을 먼저 풀어야 5·6 으로 올릴 수 있다. 새 제약은 이전이 끝난 뒤 건다.
alter table schedules drop constraint if exists chk_sch_stage_range;

do $$
declare
  remap jsonb := '{"1":"2","2":"4","3":"5","4":"6"}'::jsonb;
begin
  if exists (select 1 from schema_migrations where name = '20260927-stage-6') then
    raise notice '20260927-stage-6: 이미 적용됨 — 건너뜀';
    return;
  end if;

  -- 1) 단계 번호를 뒤에서부터 옮긴다 (앞에서부터 하면 서로 덮어쓴다)
  update schedules set stage = 6 where stage = 4;
  update schedules set stage = 5 where stage = 3;
  update schedules set stage = 4 where stage = 2;
  update schedules set stage = 2 where stage = 1;
  -- stage 0 은 그대로 (아직 아무것도 안 한 상태)

  -- 2) 체크 시각 기록의 키도 같은 규칙으로 옮긴다
  update schedules s
  set stage_dates = (
    select coalesce(jsonb_object_agg(coalesce(remap ->> key, key), value), '{}'::jsonb)
    from jsonb_each(s.stage_dates)
  )
  where s.stage_dates is not null and s.stage_dates <> '{}'::jsonb;

  -- 3) 처리자 기록도 동일하게
  update schedules s
  set stage_by = (
    select coalesce(jsonb_object_agg(coalesce(remap ->> key, key), value), '{}'::jsonb)
    from jsonb_each(s.stage_by)
  )
  where s.stage_by is not null and s.stage_by <> '{}'::jsonb;

  insert into schema_migrations (name) values ('20260927-stage-6');
  raise notice '20260927-stage-6: 적용 완료';
end $$;

-- 4) 새 단계 범위 제약 (0~6). 위에서 옛 제약을 이미 풀어두었다.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_sch_stage_range') then
    alter table schedules add constraint chk_sch_stage_range
      check (stage is null or (stage >= 0 and stage <= 6));
  end if;
end $$;

comment on column schedules.stage is
  '진행 단계 0~6: 0 시작전, 1 AI파일 받기, 2 출력물 발주, 3 출력물 수령, 4 랩핑, 5 출고, 6 회수(제작은 5까지)';

-- 확인용
--   select stage, count(*) from schedules group by stage order by stage;
--   select name, applied_at from schema_migrations;

-- =====================================================================
--  끝. 로컬에서  npm run check:schema  로 확인하세요.
-- =====================================================================
