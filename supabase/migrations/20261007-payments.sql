-- 입금 내역을 건별로 기록 (부분 입금 대응)
--
-- 그동안 settlements 에 paid_date / paid_amount 가 하나씩만 있어
-- 계약금과 잔금을 나눠 받으면 담을 데가 없었다. 합계만 적고 날짜는
-- 둘 중 하나를 골라야 했고, 그 결과 정산 계산기가 입금일로 달을 나눌 때
-- 두 달치 돈이 한 달에 몰렸다.
--
-- settlements.paid_amount 는 '합계'로 계속 유지한다. 상태 뱃지·미수 계산·
-- 백업 등 여러 곳이 그 값을 보고 있어, settlements 를 분리할 때 썼던 것과
-- 같이 양쪽에 쓰면서 옮긴다.
--
-- 되돌리기:
--   drop table if exists payments;
--   delete from schema_migrations where name = '20261007-payments';

create table if not exists schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  inquiry_id  uuid not null references inquiries(id) on delete cascade,
  paid_date   date   not null,
  amount      bigint not null,
  memo        text,                       -- 계약금 / 잔금 등
  created_by  text,                       -- 입금 처리한 사람
  created_at  timestamptz not null default now()
);

alter table payments enable row level security;  -- 정책 없음 → service_role 만

create index if not exists idx_payments_inquiry on payments (inquiry_id);
create index if not exists idx_payments_date    on payments (paid_date);

-- 금액은 0보다 커야 한다 (취소는 행을 지운다)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_payments_amount'
  ) then
    alter table payments add constraint chk_payments_amount check (amount > 0);
  end if;
end $$;

comment on table  payments        is '입금 내역 (건별). settlements.paid_amount 는 이 표의 합계를 유지한다.';
comment on column payments.memo   is '계약금 / 잔금 등 구분 메모';

-- 기존 1회 입금을 그대로 옮긴다 (한 번만)
do $$
begin
  if exists (select 1 from schema_migrations where name = '20261007-payments') then
    return;
  end if;

  insert into payments (inquiry_id, paid_date, amount, created_by, created_at)
  select s.inquiry_id, s.paid_date, s.paid_amount, s.paid_by,
         coalesce(s.paid_at, now())
  from settlements s
  where s.paid_date is not null
    and s.paid_amount is not null
    and s.paid_amount > 0
    and not exists (
      select 1 from payments p where p.inquiry_id = s.inquiry_id
    );

  insert into schema_migrations (name) values ('20261007-payments');
end $$;
