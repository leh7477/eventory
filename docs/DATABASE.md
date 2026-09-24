# 데이터베이스 명세

PostgreSQL (Supabase) · 2026-09-24 기준 **118행**

## 테이블

### 공개 (홈페이지 노출)
| 테이블 | 행 | 용도 | RLS |
|---|---|---|---|
| `banners` | 5 | 메인 배너 | 공개 읽기 |
| `categories` | 6 | 장비 종류 | 공개 읽기 |
| `products` | 3 | 제품(중단 배너) | 공개 읽기 |
| `product_images` | 0 | 제품 사진 | 공개 읽기 |
| `cases` | 0 | 행사 사례 | 공개 읽기 |
| `case_images` | 0 | 사례 사진 | 공개 읽기 |
| `settings` | 1 | 히어로 방식 등 | 공개 읽기 |

### 운영 (관리자 전용)
| 테이블 | 행 | 용도 | RLS |
|---|---|---|---|
| **`inquiries`** | 17 | 견적 문의 — **개인정보 포함** | INSERT만 허용, 읽기 불가 |
| `schedules` | 13 | 행사 일정 — **연락처 포함** | 정책 없음 = service_role만 |
| `schedule_items` | 5 | 일정별 기기 배정 | service_role만 |
| `equipment` | 8 | 보유 기기 | service_role만 |
| `vendors` | 1 | 거래처 | service_role만 |
| `rental_rates` | 6 | 대여·제작 단가 | service_role만 |
| `shipping_rates` | 53 | 배송료 | service_role만 |
| `audit_log` | — | 변경 이력 (SQL 실행 필요) | service_role만 |

## RLS 정책

**RLS가 실질적 유일한 방어선이다.** 브라우저가 PostgREST로 DB에 직접 닿기 때문.

| 정책 | 대상 |
|---|---|
| 공개 읽기 | banners, categories, products, product_images, cases, case_images, settings |
| 익명 INSERT | `inquiries` (견적 폼) |
| 정책 없음 | 나머지 전부 → service_role만 접근 |

### 실측 확인 (2026-09-24)
- 익명 키로 문의 17건 조회 → **0건 노출**
- 익명 키로 실제 행 수정·삭제 시도 → **변경되지 않음**
- 빌드 결과물 19개 파일에서 service_role 키 검색 → **0건**
- 익명 INSERT는 **무제한 가능** (50건 한 번에 성공) → Cloudflare 봇 차단 필요

### 새 테이블을 만들 때
```sql
alter table <이름> enable row level security;
-- 공개 읽기가 필요하면 명시적으로:
-- create policy "public read <이름>" on <이름> for select to anon, authenticated using (true);
```
RLS를 켜고 정책을 안 만들면 **service_role만 접근**한다 (안전한 기본값).

## 개인정보가 있는 곳

| 테이블 | 컬럼 |
|---|---|
| `inquiries` | `contact_name` `phone` `email` `address` `address_detail` `company_name` |
| `schedules` | `client_manager` `client_phone` `location` |
| `vendors` | `contact` `phone` |

**암호화는 하지 않는다.** 이름·전화·이메일·주소는 저장 시 암호화 의무 대상이 아니다.
(의무 대상: 주민번호 등 고유식별정보, 비밀번호, 생체정보)
대신 **전송 구간 암호화(HTTPS)가 의무**다.

비밀번호는 Supabase Auth가 해시로 보관한다. 우리 테이블에는 없다.

## 정규화 상태

### 1차 — 한 칸에 값 여러 개
| 컬럼 | 한 칸 최대 |
|---|---|
| `inquiries.activity_log` | 23건 |
| `rental_rates.prices` | 14개 |
| `schedules.stage_dates` `stage_by` | 단계별 |
| `cases.tags` | 배열 |

위반이지만 **의도적 비정규화로 허용한다.** 검색 조건으로 쓰지 않는 한 문제없다.

### 3차 — 같은 사실이 두 곳에
| 문제 | 상태 |
|---|---|
| `schedules.vendor` 가 이름(text) | **고아 데이터 발생 확인** (`아무개디자인`) |
| `schedules.client_phone` ← `inquiries.phone` 복사 | 4건 중복. 현재 값은 일치 |
| `schedule_items.category` 가 텍스트 매칭 | 현재 불일치 없음 |

### 한 테이블이 5가지 역할
`inquiries` 컬럼 **31개**:
고객정보 · 문의내용 · 진행상태 · **정산(10개)** · 이력

정산은 성격이 달라 별도 테이블이 맞다.

### 안 쓰는 구버전 컬럼
| 컬럼 | 사용 | 대체 |
|---|---|---|
| `inquiries.name` | 0건 | `contact_name` |
| `inquiries.event_date` | 0건 | `event_start` |

### 정리 우선순위
1. `schedules.vendor` → `vendor_id` FK (이미 깨짐) — SQL 준비됨
2. 정산 컬럼 → 별도 테이블
3. 구버전 컬럼 삭제 (한 달 관찰 후)

**지금 118행이라 급하지 않다. 데이터가 늘기 전이 가장 싸다.**

## 스키마 변경

| 파일 | 역할 |
|---|---|
| `supabase/schema.sql` | 전체 (새 프로젝트 생성용) |
| `supabase/migrations/*.sql` | 변경분 (기존 DB 적용용) |

절차는 [`supabase/migrations/README.md`](../supabase/migrations/README.md) 참고.

**스키마 변경이 배포보다 먼저다.** 순서가 바뀌면 "컬럼 없음"으로 화면이 죽는다.
