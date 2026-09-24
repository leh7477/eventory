# 리소스 명세

## 환경변수 (`.env.local`)

| 변수 | 공개 여부 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저 노출 | Supabase 주소 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저 노출 | 공개 읽기·문의 등록. **노출돼도 정상** |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용** | RLS 우회. **절대 노출 금지** |
| `NEXT_PUBLIC_SITE_URL` | 브라우저 노출 | SEO·sitemap·OG 절대 URL |
| `NEXT_PUBLIC_NAVER_FORM_URL` | 브라우저 노출 | (선택) 네이버폼 링크 |

### 규칙
- `NEXT_PUBLIC_` 이 붙으면 **브라우저 번들에 들어간다.** 비밀값에 붙이지 않는다
- `.env.local` 은 git에 올리지 않는다 (`.gitignore`에 `.env*.local`)
- 형식은 `.env.local.example` 참고 (값은 비워둘 것)
- `service_role` 키를 메신저·채팅으로 보내지 않는다

### 현재 운영 서버 설정
```
NEXT_PUBLIC_SITE_URL=http://134.185.108.37:3001
```
⚠️ 도메인 연결 후 `https://www.eventland.co.kr` 로 바꿔야 한다.

## 폰트 — `app/fonts/`

| 파일 | 토큰 | 용도 |
|---|---|---|
| `PretendardVariable.woff2` | `--font-pretendard` | 본문 전체 (weight 45~920) |
| `GeistVariable.woff2` | `--font-display` | 타이포 히어로 (굵기 애니메이션) |
| `NanumGeumeunbohwa.ttf` | `--font-handwriting` | 히어로 한글 헤드라인 |

Google Fonts (next/font/google): **Poppins** (로고), **Jura** (헤더 워드마크)

모두 `display: "swap"`. 로컬 폰트는 자체 호스팅이라 외부 요청이 없다.

## 이미지 — `public/`

| 파일 | 용도 |
|---|---|
| `og.png` | 링크 공유 미리보기 (Open Graph) |
| `images/gacha-black.webp` | 가챠머신 카드 |
| `images/gacha.png` | 원본 |

현재 3개 · 약 1.9MB.

### 규칙
- 사진은 **WebP**, 화면용은 긴 변 **1600px 이하**
- 업로드 이미지는 `public/`이 아니라 **Supabase Storage** (`eventory-images` 버킷)
- `next.config.js`가 `*.supabase.co/storage/v1/object/public/**` 만 허용
- 새 외부 이미지 도메인은 `remotePatterns`에 추가해야 표시된다

## 외부 서비스

| 서비스 | 용도 | 키 |
|---|---|---|
| Supabase | DB·인증·파일 | 필요 |
| 다음 우편번호 | 주소 검색 (`QuoteForm`) | 불필요 |
| 네이버지도 | 상세 화면 주소 링크 | 불필요 |
| YouTube | 쇼츠 임베드 | 불필요 |
| Oracle Cloud | 서버 | SSH 키 |
| Cloudflare | (예정) HTTPS·WAF | 도메인 필요 |

### 개인정보 위탁
Supabase(DB 보관)와 Oracle Cloud(서버)는 **처리방침 제5조에 위탁업체로 명시**되어 있다.
새 외부 서비스에 개인정보를 넘기면 **처리방침을 함께 고쳐야 한다.**

⚠️ Supabase 리전이 국외면 **국외이전 고지**가 추가로 필요하다.
(대시보드 → Settings → General → Region)

## 의존성

```
런타임 : next 14.2 · react 18 · @supabase/ssr · @supabase/supabase-js · sharp
개발   : tailwindcss · postcss · autoprefixer · eslint · eslint-config-next
```

의존성을 최소로 유지한다. 새로 추가할 때는 **정말 필요한지** 먼저 따진다.

## 서버 경로

| 경로 | 내용 |
|---|---|
| `~/eventory` | 애플리케이션 |
| `~/backups/eventory/YYYY-MM-DD/` | DB 백업 (권한 700, 30일 보관) |
| `~/.pm2/logs/eventory-*.log` | 앱 로그 (pm2-logrotate 10MB/14개) |
| `/var/log/eventland/access.log` | **접속기록 (13개월 보관, 법정 의무)** |
| `/etc/nginx/sites-available/eventland` | nginx 설정 |

⚠️ 백업에는 고객 개인정보가 들어 있다. 권한 700을 유지하고,
외부로 옮길 때는 반드시 암호화한다.
