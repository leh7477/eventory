# 디자인 규칙

정의 위치: `tailwind.config.js` · `app/globals.css` · `app/layout.js`

## 색

| 토큰 | 값 | 용도 |
|---|---|---|
| `primary` | `#FF5470` | 브랜드, 주요 버튼, 강조, 필수(•) 표시 |
| `primary-dark` | `#E63E5C` | primary 눌림 상태 |
| `primary-light` | `#FFE4EA` | primary 연한 배경 |
| `accent` | `#FFB627` | 포인트 (노랑) |
| `cream` | `#FFF7F3` | 섹션 배경 |
| `ink` | `#2B2233` | 본문 글자, 어두운 버튼 배경 |

### 투명도 사용법
회색이 따로 없다. **`ink` 에 투명도를 얹어 쓴다.**

| 표기 | 용도 |
|---|---|
| `text-ink` | 제목, 본문 강조 |
| `text-ink/70` | 본문 |
| `text-ink/60` `text-ink/55` | 보조 설명 |
| `text-ink/45` `text-ink/35` | 흐린 안내, placeholder |
| `border-ink/10` `border-ink/15` | 테두리 |
| `bg-ink/[0.02]` `bg-ink/5` | 아주 옅은 배경 |

### 의미 색 (관리자)
| 색 | 의미 |
|---|---|
| `blue-*` | 납품 |
| `amber-*` | 회수 |
| `emerald-*` / `green-*` | 완료, 입금, 물품 |
| `red-*` | 경고, 미수, 준비 미완료 |
| `violet-*` | 오늘 |
| `slate-*` | 업무(행사 외) |

## 글꼴

| 토큰 | 폰트 | 용도 |
|---|---|---|
| `font-sans` (기본) | Pretendard Variable | 본문 전체 |
| `font-heading` | Pretendard Variable | 제목 |
| `font-logo` | Poppins | 영문 워드마크 |
| `font-tesla` | Jura | 헤더 로고 (얇고 넓은 지오메트릭) |
| `font-handwriting` | 나눔 금은보화 | 히어로 한글 헤드라인 전용 |
| `--font-display` | Geist Variable | 타이포 히어로 (굵기 애니메이션) |

Pretendard·나눔·Geist는 `app/fonts/` 로컬 파일, Poppins·Jura는 next/font/google.
모두 `display: "swap"`.

## 크기 기준

| 용도 | 클래스 |
|---|---|
| 페이지 제목 | `text-3xl sm:text-4xl font-bold` |
| 섹션 제목 | `text-lg font-bold` ~ `text-xl` |
| 카드 제목 | `text-sm font-semibold` |
| 본문 | `text-sm` |
| 보조 설명 | `text-xs` |
| 배지·꼬리표 | `text-[10px]` `text-[11px]` |

관리자 화면은 정보 밀도가 높아 `text-xs` ~ `text-sm` 중심이다.

## 모양

| 요소 | 규칙 |
|---|---|
| 카드 | `rounded-xl border border-ink/10 bg-white` |
| 큰 컨테이너 | `rounded-2xl` |
| 버튼 | `rounded-md` (관리자) / `rounded-full` (공개 CTA) |
| 배지 | `rounded-full px-2 py-0.5 text-[10px] font-bold` |
| 입력칸 | `rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary` |

### 버튼
```
주요   bg-ink text-white hover:bg-black          (관리자 저장·추가)
       bg-primary text-white                      (공개 CTA)
보조   border border-ink/15 text-ink/60 hover:bg-ink/5
켜짐   bg-ink text-white                          (토글·필터 선택 상태)
비활성 disabled:opacity-60  또는  disabled:opacity-40
```

## 배치

| 상황 | 규칙 |
|---|---|
| 페이지 폭 | 본문 `max-w-3xl` / 목록 `max-w-4xl` / 넓은 화면 `max-w-5xl` |
| 좌우 여백 | `px-5` (모바일) → `md:px-6 lg:px-10` |
| 저장·취소 버튼 | **오른쪽 정렬** `flex justify-end gap-2` |
| 폼 라벨 | 입력칸 위, `mb-1.5 text-xs font-medium text-ink/60` |
| 필수 표시 | 라벨 뒤 `<span className="text-primary">•</span>` |

### 지켜야 할 것
- **모바일 375px에서 가로 스크롤이 생기면 안 된다**
- 우하단에 떠 있는 문의 버튼이 있다. **그 자리에 클릭할 것을 두지 않는다**
  (실제로 푸터의 개인정보처리방침 링크가 가려진 적이 있다)
- 긴 한글 주소는 `[overflow-wrap:anywhere]` + `table-fixed` + `min-w-0` 으로 처리
- `sticky` 를 쓰는 화면의 부모에 `overflow-x-hidden` 을 두지 않는다.
  스크롤 컨테이너가 되어 `sticky` 가 깨진다. `overflow-x-clip` 을 쓴다

## 인쇄 (견적서)

`app/globals.css` 의 `@media print`.

- `@page { size: A4 portrait; margin: 10mm 12mm }`
- A4 인쇄 가능 높이 ≈ **1047px**
- 품목 수에 따라 CSS 변수로 밀도를 조절한다
  (`--qs-fs` 글자, `--qs-td` 표 여백, `--qs-m8` `--qs-m6` 간격, `--qs-h2` 제목)
- 변수는 `#quote-sheet` 에 인라인으로 주입 (`qsVars`)

**측정 방법:** 인쇄 미리보기는 실제와 다르다. 입력칸의 테두리·여백이
인쇄 시 사라지고 카드가 2열로 강제되는 점을 반영해서 재야 한다.
