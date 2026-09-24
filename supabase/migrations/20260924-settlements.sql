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
