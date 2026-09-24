# 컴포넌트 명세

`server` = 서버 컴포넌트, `client` = `"use client"`

## 공개 사이트 — `components/`

### 레이아웃
| 컴포넌트 | 종류 | 역할 |
|---|---|---|
| `SiteHeader` | server | 헤더 껍데기. 실제 동작은 아래로 위임 |
| `SiteHeaderClient` | client | 메뉴 열기/닫기, 스크롤 반응 |
| `SiteFooter` | server | 사업자 정보, **개인정보처리방침 링크** |
| `FloatingContact` | client | 우하단 고정 전화·견적 버튼 |
| `PhonePopup` | client | 전화 문의 팝업 |
| `LogoAnimated` | server | EVENT LAND 워드마크 |

### 히어로
| 컴포넌트 | 종류 | 역할 |
|---|---|---|
| `HeroTypo` | client | 타이포 히어로. 글자별 굵기 애니메이션 |
| `HeroCarousel` | client | 배너 전환 |
| `HeroSlider` | server | 배너 나열 |
| `HeroCopy` | server | 히어로 문구 |

히어로 방식은 DB `settings.hero_mode` 로 전환 (`static` / `slide` / `marquee`).

### 콘텐츠
| 컴포넌트 | 종류 | 역할 |
|---|---|---|
| `CategoryGrid` `CategoryIcon` `CategoryShowcase` | server/client | 장비 종류 |
| `ProductCard` `ProductGallery` | server/client | 제품 |
| `CaseCard` `CaseGallery` `CaseTopGallery` | server/client | 행사 사례 |
| `ShortsRow` | client | 유튜브 쇼츠 |
| `HomeFeature` | client | 홈 특징 섹션 |
| `Reveal` | client | 스크롤 등장 효과 |
| `DragScroll` | client | 가로 드래그 스크롤 |

### 입력
| 컴포넌트 | 종류 | 역할 |
|---|---|---|
| **`QuoteForm`** | client | **견적 문의 폼. 개인정보 수집 지점** |
| `DatePicker` | client | 날짜 선택 |
| `QuoteButton` | server | 견적 문의 이동 버튼 |

#### QuoteForm — 개인정보를 다루므로 수정 시 주의
- 수집 항목은 `lib/privacy.js` 의 `COLLECTED_REQUIRED` 와 **반드시 일치**해야 한다
  (처리방침에 고지한 항목과 실제 수집 항목이 다르면 법적 문제)
- 동의 체크 없이는 전송되지 않는다
- 동의 시각·버전을 함께 저장. 컬럼이 없으면 본문만 저장하고 진행
- 주소는 다음 우편번호 서비스(외부 스크립트, 키 불필요)

## 관리자 — `components/admin/`

전부 `client`. 데이터는 상위 `page.js`(서버)가 조회해 props로 내려준다.

### 공통
| 컴포넌트 | 역할 |
|---|---|
| `AdminSidebar` | 메뉴. 권한 있는 항목만 표시 |
| `AdminIdleGuard` | 2시간 무활동 자동 로그아웃. 10분 전 팝업 |
| `PasswordChangeModal` | 비밀번호 변경 (10자 이상) |
| `AccountsManager` | 계정·권한. 메뉴를 홈페이지/운영 관리로 묶어 표시 |

### 운영
| 컴포넌트 | 줄수 | 역할 |
|---|---|---|
| `InquiriesManager` | 1202 | 견적 문의 목록·상태·일정 등록 |
| `ScheduleManager` | 1150 | 일정 탭 — 행사 순 목록 + 달력 |
| `DispatchView` | 473 | 상세 탭 — 날짜별 납품·회수. 주소→네이버지도 |
| `QuoteSheet` | 729 | 견적서. A4 1장 인쇄 |
| `SettlementManager` | 584 | 정산 — 계산서·입금 |
| `EquipmentBoard` `InventoryManager` | 317/288 | 재고 |
| `VendorsManager` | 310 | 거래처 |
| `ShippingRateManager` `RentalRateManager` `MadeRateManager` | 187/118/103 | 단가 |
| `ScheduleEquipment` `ScheduleInfo` `AvailabilityChecker` `TimeSelect` | | 일정 보조 |
| `SalesTabs` `StatsYearList` | | 매출 |

### 홈페이지 관리
`BannerManager` `HeroSettings` `HeroTextEditor` `CategoriesManager`
`CategorySpecEditor` `ProductManager` `CaseManager` `StoriesSettings`

## 작성 규칙

### 서버/클라이언트 나누기
```
page.js (server)  ──props──▶  <Manager/> (client)
   데이터 조회                   상태·이벤트·화면
```
- `page.js`에서 `createAdminClient()`로 조회
- 쓰기는 `actions.js` 서버 액션 호출

### 클라이언트에서 서버 액션 호출
```jsx
const [pending, startTransition] = useTransition();
const run = (fn) => startTransition(async () => {
  const res = await fn();
  if (res?.error) setError(res.error);
  else router.refresh();
});
```
- 액션은 던지지 않고 `{ ok: true }` 또는 `{ error: "..." }` 를 돌려준다
- 성공 후 `router.refresh()` 로 서버 데이터를 다시 읽는다

### 금지
- 클라이언트 컴포넌트에서 `lib/supabase/admin` import (키 유출)
- 화면에서 숨기는 것만으로 권한 처리 (서버 액션에서 `requireSection` 필수)

### 1000줄이 넘는 컴포넌트
`InquiriesManager`(1202) `ScheduleManager`(1150)은 이미 크다.
새 기능은 **별도 컴포넌트로 분리**하고 이 둘을 더 키우지 않는다.
