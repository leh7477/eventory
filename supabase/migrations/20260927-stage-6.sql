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
