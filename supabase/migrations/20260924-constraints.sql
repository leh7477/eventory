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
