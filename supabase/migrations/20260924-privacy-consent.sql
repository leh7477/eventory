-- 개인정보 수집·이용 동의 기록 (개인정보보호법 제15조 — 동의 사실 입증용)
--
-- 견적 문의 폼에서 동의한 시각과 동의문 버전을 함께 저장한다.
-- 이 컬럼이 없어도 폼은 동작하지만(코드에 예비 동작이 있음) 동의 기록이 남지 않는다.

alter table inquiries add column if not exists privacy_agreed_at timestamptz;
alter table inquiries add column if not exists privacy_version text;

comment on column inquiries.privacy_agreed_at is '개인정보 수집·이용에 동의한 시각';
comment on column inquiries.privacy_version is '동의 당시 동의문 버전 (lib/privacy.js PRIVACY_VERSION)';
