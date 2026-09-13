import Link from "next/link";
import { SITE } from "@/lib/constants";

// 히어로 바로 아래 큰 카드 2개 (Tesla 홈 느낌) — 대표 장비 강조
// items: [{ name, tagline, bg?(gradient class), image?(url) }]
export default function HomeFeature({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-[1440px] px-5 pt-8 pb-2 sm:pt-12">
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((it) => (
          <article
            key={it.name}
            className={`relative flex min-h-[400px] flex-col overflow-hidden rounded-3xl sm:min-h-[520px] ${it.bg || "bg-ink"}`}
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
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20" />

            {/* 상단 라벨 */}
            <div className="relative z-10 p-7 sm:p-9">
              <p className="text-sm font-semibold text-white/90 drop-shadow sm:text-base">
                {it.tagline}
              </p>
            </div>

            {/* 하단 이름 + 버튼 */}
            <div className="relative z-10 mt-auto flex flex-col items-center gap-5 p-7 pb-9 text-center sm:p-9 sm:pb-10">
              <h3 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl">
                {it.name}
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/contact"
                  className="rounded-full bg-white px-7 py-3 text-sm font-bold text-ink shadow transition hover:bg-white/90 active:scale-[0.98]"
                >
                  견적문의
                </Link>
                <a
                  href={`tel:${SITE.phone}`}
                  className="rounded-full border border-white/70 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-[0.98]"
                >
                  전화문의
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
