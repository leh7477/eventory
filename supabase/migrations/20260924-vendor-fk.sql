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
