-- 가챠머신 캡슐 발송 체크
--
-- 가챠머신은 출력물을 발주할 때 캡슐도 함께 보내야 한다.
-- 다른 장비에는 없는 일이라 진행 단계(stage) 체인에는 넣지 않는다.
--   · stage 는 정수 하나라 순서가 곧 숫자다. 가챠머신만 단계를 끼우면
--     같은 숫자가 품목마다 다른 뜻이 되어 기존 데이터를 또 재매핑해야 한다.
--   · 캡슐 발송은 게이트가 아니다. 출력물 수령이나 랩핑을 막지 않는
--     병렬 작업이라 체인에 묶으면 오히려 진행이 막힌다.
-- 그래서 체인과 무관한 독립 플래그로 둔다.
--
-- 되돌리기:
--   alter table schedules drop column if exists capsule_sent_at;
--   alter table schedules drop column if exists capsule_by;
--   delete from schema_migrations where name = '20261007-capsule';

create table if not exists schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

alter table schedules add column if not exists capsule_sent_at timestamptz;
alter table schedules add column if not exists capsule_by      text;

comment on column schedules.capsule_sent_at is '가챠머신 캡슐 발송 시각 (null 이면 미발송)';
comment on column schedules.capsule_by      is '캡슐 발송을 체크한 사람';

insert into schema_migrations (name) values ('20261007-capsule')
on conflict (name) do nothing;
