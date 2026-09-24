# 이벤트랜드 문서

| 문서 | 내용 | 주로 볼 사람 |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | 시스템 구조, 계층, 폴더 구조 | 개발 |
| [DATABASE.md](DATABASE.md) | 테이블 명세, 정규화 상태 | 개발 |
| [COMPONENTS.md](COMPONENTS.md) | 화면 구성요소 명세 | 개발 |
| [DESIGN.md](DESIGN.md) | 색·글꼴·간격 등 디자인 규칙 | 개발·디자인 |
| [RESOURCES.md](RESOURCES.md) | 폰트·이미지·외부 서비스·환경변수 | 개발·운영 |
| [SECURITY.md](SECURITY.md) | 보안 기준, 개인정보 처리 | 운영·개발 |
| [BACKEND.md](BACKEND.md) | 배포·백업·스키마 변경 운영 절차 | 운영 |
| [AUDIT-2026-09-24.md](AUDIT-2026-09-24.md) | 2026-09-24 점검 보고서 | 전체 |

## 빠른 참조

```bash
npm run dev      # 개발 (기본 3000)
npm run build    # 빌드 검증 — 커밋 전 반드시
npm start        # 운영 모드 실행
```

배포·백업·스키마 변경 절차는 [BACKEND.md](BACKEND.md)를 따른다.
