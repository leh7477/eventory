import Link from "next/link";
import { SITE } from "@/lib/constants";

// 히어로 바로 아래 풀블리드 큰 카드 2개 (Tesla 홈 느낌) — 좌우/사이 여백 없이 화면을 꽉 채움
// items: [{ name, tagline, bg?(gradient class), image?(url) }]
export default function HomeFeature({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="grid grid-cols-1 md:grid-cols-2">
      {items.map((it) => (
        <article
          key={it.name}
          className={`relative flex min-h-[78vh] flex-col md:min-h-[88vh] ${it.bg || "bg-ink"}`}
          style={
            it.image
              ? {
                  backgroundImage: `url(${it.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {/* 가독성용 오버레이 */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

          {/* 상단 라벨 (좌측) */}
          <div className="relative z-10 px-8 pt-12 sm:px-12 sm:pt-16">
            <p className="text-sm font-semibold tracking-wide text-white/90 drop-shadow sm:text-base">
              {it.tagline}
            </p>
          </div>

          {/* 하단 이름 + 버튼 (좌측) */}
          <div className="relative z-10 mt-auto px-8 pb-12 sm:px-12 sm:pb-16">
            <h3 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-6xl">
              {it.name}
            </h3>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className="min-w-[150px] rounded-full bg-white/95 px-8 py-3.5 text-center text-sm font-bold text-ink shadow transition hover:bg-white active:scale-[0.98]"
              >
                견적문의
              </Link>
              <a
                href={`tel:${SITE.phone}`}
                className="min-w-[150px] rounded-full border border-white/70 bg-white/10 px-8 py-3.5 text-center text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-[0.98]"
              >
                전화문의
              </a>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
