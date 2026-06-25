# Eventory

이벤트 장비 렌탈 전문 업체 **Eventory** 홈페이지 + 관리자 페이지.
사진 중심의 실사 느낌 레이아웃으로, 관리자가 사진/제품/배너를 등록하면 사용자 페이지에 자동 반영됩니다.

## 기술 스택

- Next.js 14 (App Router, JavaScript / CommonJS 설정 유지)
- Tailwind CSS
- Supabase (Database + Storage + Auth)
- sharp (이미지 리사이즈/WebP 변환)
- 배포: PM2 + Nginx (OCI 서버)

> ⚠️ `package.json`에 `"type": "module"` 을 추가하지 마세요. CommonJS 설정을 유지합니다.

## 시작하기

1. 환경변수 설정

   `.env.local.example` 을 복사해 `.env.local` 을 만들고 값을 채웁니다.

   ```bash
   cp .env.local.example .env.local
   ```

   | 변수 | 설명 |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (서버 전용) |
   | `NEXT_PUBLIC_NAVER_FORM_URL` | 견적 문의 네이버폼 링크 |

2. 의존성 설치 및 개발 서버 실행

   ```bash
   npm install
   npm run dev
   ```

   http://localhost:3000

## 프로젝트 구조

```
app/                 # App Router 페이지
  layout.js          # 루트 레이아웃 (Bebas Neue + Noto Sans KR)
  page.js            # 메인 (히어로/카테고리/인기장비/사례/CTA)
  globals.css
lib/
  constants.js       # 사이트 전역 상수
  supabase/
    client.js        # 브라우저 클라이언트
    server.js        # 서버 컴포넌트/라우트 핸들러 클라이언트
    admin.js         # service_role 관리자 클라이언트 (서버 전용)
middleware.js        # /admin/* 인증 보호
```

## Supabase

- DB 테이블 생성 SQL: `supabase/schema.sql` (2단계)
- Storage 버킷: `eventory-images` (public)

## 디자인 토큰

| 용도 | 값 |
| --- | --- |
| 메인 (딥 네이비) | `#0D0F2B` → `bg-navy` |
| 포인트 (골드) | `#FFD23F` → `text-gold` |
| 배경 | `#FFFFFF` |
| 텍스트 | `#111111` → `text-ink` |

## 진행 단계

- [x] 1단계: 프로젝트 세팅 (Next.js + Tailwind + Supabase 초기 설정)
- [ ] 2단계: DB 테이블 생성 (SQL)
- [ ] 3단계: 사용자 페이지 (메인 → 제품목록 → 상세 → 사례)
- [ ] 4단계: 관리자 페이지
