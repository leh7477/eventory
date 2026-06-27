import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HeroSlider from "@/components/HeroSlider";
import QuoteButton from "@/components/QuoteButton";
import DragScroll from "@/components/DragScroll";
import CaseGallery from "@/components/CaseGallery";
import { normalizeCases } from "@/lib/samples";
import { SITE } from "@/lib/constants";
import { getActiveBanners, getCategories, getProducts, getCases } from "@/lib/data";

export const revalidate = 0;

// 제품 데이터가 없을 때 보여줄 샘플 (쇼츠 스타일 세로 카드)
const SAMPLE_PRODUCTS = [
  { id: "p1", bg: "bg-gradient-to-br from-[#FF7A59] to-[#FF4D8D]", name: "가챠머신", cat: "가챠머신" },
  { id: "p2", bg: "bg-gradient-to-br from-[#7A2F5A] to-[#2B2233]", name: "에어볼 추첨기", cat: "에어볼추첨기" },
  { id: "p3", bg: "bg-gradient-to-br from-[#E8345A] to-[#9B3B6E]", name: "스톱워치", cat: "스톱워치" },
  { id: "p4", bg: "bg-gradient-to-br from-[#C04A6A] to-[#5B2A48]", name: "룰렛", cat: "룰렛" },
  { id: "p5", bg: "bg-gradient-to-br from-[#FF6B4A] to-[#C03A5A]", name: "사격게임기", cat: "사격게임기" },
  { id: "p6", bg: "bg-gradient-to-br from-[#9B3B6E] to-[#3A2540]", name: "핀볼게임", cat: "핀볼게임" },
];

export default async function Home() {
  const [banners, categories, products, cases] = await Promise.all([
    getActiveBanners(),
    getCategories(),
    getProducts({ limit: 6 }),
    getCases({ limit: 8 }),
  ]);

  // 사례: 실제 데이터 정규화, 없으면 샘플
  const caseItems = normalizeCases(cases);

  return (
    <>
      <SiteHeader />
      <main>
        {/* 히어로 */}
        <HeroSlider banners={banners} />

        {/* 카테고리 (제목 없이 가로 나열, 인기장비와 동일 너비로 꽉 차게) */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5 sm:justify-between sm:gap-x-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.id}`}
                className="text-lg font-bold text-ink transition hover:text-primary sm:text-2xl"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>

        {/* 인기 장비 (쇼츠 스타일 세로 카드 가로 스크롤) */}
        <section className="py-14">
          <div className="mx-auto max-w-6xl px-5">
            <DragScroll className="flex gap-4 pb-2">
              {products.length > 0
                ? products.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      className="group relative block shrink-0 basis-[calc((100%-1rem)/2)] sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-4rem)/5)]"
                    >
                      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-cream">
                        {p.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.thumbnail}
                            alt={p.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-festive">
                            <span className="font-heading font-bold tracking-widest text-white/80">
                              EVENTORY
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent" />
                        <h3 className="absolute inset-x-0 bottom-0 p-3 text-sm font-bold text-white">
                          {p.name}
                        </h3>
                      </div>
                    </Link>
                  ))
                : SAMPLE_PRODUCTS.map((p) => (
                    <div
                      key={p.id}
                      className="group relative block shrink-0 basis-[calc((100%-1rem)/2)] sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-4rem)/5)]"
                    >
                      <div
                        className={`relative aspect-[9/16] overflow-hidden rounded-2xl ${p.bg}`}
                      >
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-heading text-[11px] font-bold tracking-[0.4em] text-white/25">
                          SAMPLE
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                        <h3 className="absolute inset-x-0 bottom-0 p-3 text-sm font-bold text-white">
                          {p.name}
                        </h3>
                      </div>
                    </div>
                  ))}
            </DragScroll>
          </div>
        </section>

        {/* 행사 사례 (제목 없이 사진 바로, 가로 스크롤 + 클릭 시 상세 모달) */}
        <section className="py-14">
          <div className="mx-auto max-w-6xl px-5">
            <CaseGallery items={caseItems} />
          </div>
        </section>

        {/* CTA */}
        <section className="bg-white">
          <div className="mx-auto max-w-3xl px-5 py-24 text-center">
            <h2 className="text-balance text-2xl font-bold leading-snug text-ink sm:text-3xl">
              행사의 규모보다 중요한 것은 참여자의 경험입니다.
            </h2>
            <p className="mt-6 leading-relaxed text-ink/70 sm:text-lg">
              이벤토리는 가챠머신, 에어볼추첨기, 룰렛, 사격게임, 핀볼게임 등 다양한
              이벤트 장비를 통해{" "}
              <br className="hidden sm:block" />
              브랜드 프로모션, 팝업스토어, 박람회, 기업행사, 지역축제까지 목적에 맞는
              솔루션을 제공합니다.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <QuoteButton variant="dark" />
              <a
                href={`tel:${SITE.phone}`}
                className="rounded-full border border-ink px-6 py-3 text-sm font-medium text-ink transition hover:bg-ink hover:text-white"
              >
                전화 {SITE.phone}
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
