-- =============================================================
-- Eventory DB 스키마
-- Supabase 대시보드 → SQL Editor 에 전체 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전하도록 작성되어 있습니다 (IF NOT EXISTS / DROP POLICY).
-- =============================================================

-- gen_random_uuid() 사용을 위한 확장 (Supabase 기본 활성화돼 있으나 안전하게)
create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 테이블
-- -------------------------------------------------------------

-- 배너
create table if not exists banners (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  title text,
  subtitle text,
  order_num integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 카테고리
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  order_num integer default 0
);
-- 카테고리 기본 장비 스펙 (Stories 등록 시 기본값)
alter table categories add column if not exists default_specs text;

-- 제품
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text,
  specs text,
  is_active boolean default true,
  order_num integer default 0,
  created_at timestamptz default now()
);

-- 제품 이미지 (여러 장)
create table if not exists product_images (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade,
  image_url text not null,
  order_num integer default 0
);

-- 제품 유튜브 영상 URL (쇼츠) — 선택
alter table products add column if not exists video_url text;

-- 시공/행사 사례
create table if not exists cases (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  image_url text not null,
  tags text[],
  order_num integer default 0,
  created_at timestamptz default now()
);

-- 문의 내역
create table if not exists inquiries (
  id uuid default gen_random_uuid() primary key,
  name text,
  phone text,
  event_date text,
  message text,
  created_at timestamptz default now(),
  is_read boolean default false
);

-- -------------------------------------------------------------
-- 견적문의 폼 확장 컬럼 (기존 inquiries 테이블에 추가)
-- -------------------------------------------------------------
alter table inquiries add column if not exists company_name text;    -- 업체명
alter table inquiries add column if not exists contact_name text;     -- 담당자명
alter table inquiries add column if not exists email text;            -- 이메일
alter table inquiries add column if not exists product text;          -- 문의 제품
alter table inquiries add column if not exists usage text;            -- 제품 용도(임대/제작)
alter table inquiries add column if not exists event_start date;      -- 행사 시작일
alter table inquiries add column if not exists event_end date;        -- 행사 종료일
alter table inquiries add column if not exists address text;          -- 장소 주소
alter table inquiries add column if not exists address_detail text;   -- 상세주소
alter table inquiries add column if not exists handled boolean default false;  -- 회신 완료 여부
alter table inquiries add column if not exists handled_by text;       -- 처리한 담당자(로그인 아이디)
alter table inquiries add column if not exists handled_at timestamptz; -- 처리 시각
alter table inquiries add column if not exists activity_log jsonb default '[]'::jsonb;  -- 활동 로그(일정 등록·수정 이력)

-- -------------------------------------------------------------
-- 사례(Stories) 카테고리 연결 — 카테고리별 필터용
-- -------------------------------------------------------------
alter table cases add column if not exists category_id uuid references categories(id) on delete set null;
create index if not exists idx_cases_category on cases (category_id);
alter table cases add column if not exists specs text;  -- 사례별 장비 정보(스펙)
alter table cases add column if not exists seo_title text;        -- 검색 제목(SEO)
alter table cases add column if not exists seo_description text;  -- 검색 설명(SEO)

-- -------------------------------------------------------------
-- 사례 이미지 (여러 장 = 포트폴리오 현장 사진)
-- -------------------------------------------------------------
create table if not exists case_images (
  id uuid default gen_random_uuid() primary key,
  case_id uuid references cases(id) on delete cascade,
  image_url text not null,
  order_num integer default 0
);
alter table case_images enable row level security;
drop policy if exists "public read case_images" on case_images;
create policy "public read case_images" on case_images
  for select to anon, authenticated using (true);

-- -------------------------------------------------------------
-- 인덱스 (정렬/조회 성능)
-- -------------------------------------------------------------
create index if not exists idx_case_images_case on case_images (case_id, order_num);
create index if not exists idx_banners_order on banners (order_num);
create index if not exists idx_categories_order on categories (order_num);
create index if not exists idx_products_category on products (category_id);
create index if not exists idx_products_order on products (order_num);
create index if not exists idx_product_images_product on product_images (product_id, order_num);
create index if not exists idx_cases_order on cases (order_num);
create index if not exists idx_inquiries_created on inquiries (created_at desc);

-- -------------------------------------------------------------
-- 행사 일정 (확정된 행사 — 관리자 전용, 견적문의 연동 가능)
-- -------------------------------------------------------------
create table if not exists schedules (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  start_date date not null,
  end_date date,
  location text,
  memo text,
  inquiry_id uuid references inquiries(id) on delete set null,
  created_at timestamptz default now()
);
alter table schedules enable row level security;  -- 정책 없음 → 관리자(service_role)만 접근
create index if not exists idx_schedules_start on schedules (start_date);
-- 행사 시작/종료 시간 (추후 입력 가능)
alter table schedules add column if not exists start_time time;
alter table schedules add column if not exists end_time time;
-- 실제 행사 기간 (설치/회수와 별개 — 전날 설치 대응)
alter table schedules add column if not exists event_start date;
alter table schedules add column if not exists event_end date;

-- -------------------------------------------------------------
-- 사이트 설정 (단일 행) — 홈 Stories 자동 롤링 등
-- -------------------------------------------------------------
create table if not exists settings (
  id int primary key default 1,
  home_stories_autoplay boolean default false,
  home_stories_mode text default 'off',   -- off | marquee | carousel
  home_stories_speed int default 30
);
insert into settings (id) values (1) on conflict (id) do nothing;
alter table settings add column if not exists home_stories_mode text default 'off';
alter table settings enable row level security;
drop policy if exists "public read settings" on settings;
create policy "public read settings" on settings
  for select to anon, authenticated using (true);

-- -------------------------------------------------------------
-- RLS (Row Level Security)
--   읽기 전용 공개 데이터: 누구나(anon) SELECT 가능
--   문의(inquiries): 누구나 INSERT 가능, 읽기는 불가
--   모든 쓰기(관리자)는 service_role 키로 수행 → RLS 우회되므로 별도 정책 불필요
-- -------------------------------------------------------------
alter table banners enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table cases enable row level security;
alter table inquiries enable row level security;

-- 공개 읽기 정책
drop policy if exists "public read banners" on banners;
create policy "public read banners" on banners
  for select to anon, authenticated using (true);

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories
  for select to anon, authenticated using (true);

drop policy if exists "public read products" on products;
create policy "public read products" on products
  for select to anon, authenticated using (true);

drop policy if exists "public read product_images" on product_images;
create policy "public read product_images" on product_images
  for select to anon, authenticated using (true);

drop policy if exists "public read cases" on cases;
create policy "public read cases" on cases
  for select to anon, authenticated using (true);

-- 문의: 누구나 등록(INSERT) 가능, SELECT 정책은 없음 → 관리자(service_role)만 조회
drop policy if exists "public insert inquiries" on inquiries;
create policy "public insert inquiries" on inquiries
  for insert to anon, authenticated with check (true);

-- -------------------------------------------------------------
-- 기본 카테고리 시드 (이미 있으면 중복 삽입하지 않음)
-- -------------------------------------------------------------
insert into categories (name, order_num)
select v.name, v.order_num
from (values
  ('가챠머신', 1),
  ('에어볼추첨기', 2),
  ('스톱워치', 3),
  ('룰렛', 4),
  ('사격게임기', 5),
  ('캡슐뽑기', 6)
) as v(name, order_num)
where not exists (select 1 from categories c where c.name = v.name);
