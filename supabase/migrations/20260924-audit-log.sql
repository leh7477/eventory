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
