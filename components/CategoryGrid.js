import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";

// 왼쪽 소개 텍스트 + 오른쪽 2×3 카드 그리드 (아이엠브랜드 'Our Creator' 느낌).
// 사진(대표 사례)이 있으면 사진을, 없으면 브랜드 컬러 + 아이콘으로 채운다.
const TAGS = ["팝업스토어", "지역축제", "기업행사", "박람회"];

export default function CategoryGrid({ items = [] }) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-14">
      {/* 왼쪽: 소개 */}
      <div>
        <p className="font-heading text-sm font-bold tracking-[0.2em] text-primary">
          MAKE IT SPECIAL
        </p>
        <h2 className="mt-4 text-balance text-2xl font-bold leading-snug text-ink sm:text-3xl xl:text-4xl">
          현장을 채우는 재미,
          <br />
          이벤토리가 준비했습니다.
        </h2>

        {/* 행사 유형 태그 (제목 아래 한 줄) */}
        <div className="mt-5 flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <span
              key={t}
              className="rounded-full bg-ink/5 px-3 py-1.5 text-xs font-medium text-ink/60"
            >
              {t}
            </span>
          ))}
        </div>

        <Link
          href="/cases"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-white transition hover:bg-black"
        >
          전체 보기
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* 오른쪽: 2×3 카드 그리드 */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href={`/cases?category=${c.id}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-festive"
            >
              {c.image ? (
                <>
                  {/* 샘플이 외부 도메인이라 plain img 사용 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <CategoryIcon name={c.name} className="h-1/3 w-1/3 text-white/85" />
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-base font-bold text-white sm:text-lg">{c.name}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
