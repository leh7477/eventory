# 시스템 구조

## 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js 14.2 (App Router, JavaScript) |
| UI | React 18 + Tailwind CSS |
| DB · 인증 · 파일 | Supabase (PostgreSQL / GoTrue / Storage) |
| 이미지 최적화 | sharp |
| 서버 | Oracle Cloud Ubuntu, pm2, nginx |

TypeScript를 쓰지 않는다. 타입 대신 **주석과 작은 함수**로 의도를 남긴다.

## 계층

```
  ┌─ 표현 계층 ──────────────────────────────┐
  │ app/(공개 페이지)   components/          │
  │ app/admin/(panel)   components/admin/    │
  └──────────────────┬───────────────────────┘
                     │
  ┌─ 응용 계층 ───────┴───────────────────────┐
  │ 서버 액션  app/admin/(panel)/*/actions.js │
  │ 권한 확인  lib/admin/auth.js              │
  │ 이력 기록  lib/admin/audit.js             │
  └──────────────────┬───────────────────────┘
                     │
  ┌─ 데이터 계층 ─────┴───────────────────────┐
  │ PostgreSQL + RLS (Supabase)              │
  └──────────────────────────────────────────┘
```

## 데이터 흐름 — 세 가지 경로

| 경로 | 사용 키 | 권한 | 쓰는 곳 |
|---|---|---|---|
| 공개 읽기 | anon | RLS 공개 정책 | 배너·제품·사례·설정 |
| 견적 문의 등록 | anon | RLS INSERT 만 허용 | `components/QuoteForm.js` |
| 관리자 | **service_role** | RLS 우회 | 서버 액션 전부 |

### 중요한 성질

1. **`service_role` 키는 절대 브라우저로 가면 안 된다.**
   `lib/supabase/admin.js`는 서버 액션·라우트 핸들러에서만 import한다.
   `"use client"` 파일에서 import하면 키가 번들에 실려 유출된다.

2. **RLS가 실질적 방어선이다.**
   Supabase는 PostgREST로 테이블을 REST API로 자동 노출한다.
   즉 브라우저가 DB에 직접 닿을 수 있어, 보호 여부는 애플리케이션 코드가 아니라
   **테이블 정책**이 결정한다.

3. **미들웨어는 화면 이동만 막는다.**
   서버 액션은 스스로 권한을 확인해야 한다 → `requireSection()`.

## 폴더 구조

```
app/
  (공개)           page.js, about/, cases/, products/, contact/, privacy/
  admin/
    page.js        로그인
    (panel)/       로그인 필요 구역
      <메뉴>/
        page.js    화면 (서버 컴포넌트, 데이터 조회)
        actions.js 서버 액션 (쓰기, 권한 확인)
  fonts/           로컬 폰트 파일
  globals.css      전역 스타일 + 견적서 인쇄 CSS

components/        공개 화면 구성요소
components/admin/  관리자 화면 구성요소

lib/
  supabase/        admin(service_role) / client(브라우저) / server(쿠키) / public(익명)
  admin/           auth(권한) sections(메뉴 정의) audit(이력) session(자동 로그아웃) storage
  constants.js     사이트 상수   privacy.js 개인정보 고지 정의
  date.js inventory.js seo.js data.js samples.js youtube.js

supabase/
  schema.sql       전체 스키마 (새 프로젝트 생성용)
  migrations/      변경분 (날짜순) — 기존 DB에 적용

scripts/           운영 스크립트 (백업 등)
docs/              문서
public/            정적 파일
```

## 규칙

### 페이지와 액션
- `page.js`는 **서버 컴포넌트**로 두고 데이터 조회만 한다
- 쓰기는 반드시 같은 폴더의 `actions.js` 서버 액션으로
- 액션 첫 줄은 항상 `const user = await requireSection("<메뉴key>")`

### 클라이언트 컴포넌트
- 상태·이벤트가 필요할 때만 `"use client"`
- 클라이언트 파일에서 `lib/supabase/admin` 을 import하지 않는다

### 새 메뉴를 추가할 때
1. `lib/admin/sections.js`의 `ADMIN_SECTIONS`에 `{key, href, label, group}` 추가
2. `app/admin/(panel)/<key>/page.js` + `actions.js` 생성
3. 액션에 `requireSection("<key>")` 적용
4. 쓰기 액션에 `writeAudit()` 추가
5. 테이블을 새로 만들면 RLS를 켜고 정책을 **의도적으로** 정한다
