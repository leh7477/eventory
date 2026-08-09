import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HeroSlider from "@/components/HeroSlider";
import QuoteButton from "@/components/QuoteButton";
import ShortsRow from "@/components/ShortsRow";
import CaseGallery from "@/components/CaseGallery";
import CategoryShowcase from "@/components/CategoryShowcase";
import CategoryGrid from "@/components/CategoryGrid";
import { normalizeCases } from "@/lib/samples";
import { SITE } from "@/lib/constants";
import { getActiveBanners, getCategories, getProducts, getCases, getSettings } from "@/lib/data";

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
  const [banners, categories, products, cases, settings] = await Promise.all([
    getActiveBanners(),
    getCategories(),
    getProducts({ limit: 6 }),
    getCases({ limit: 8 }),
    getSettings(),
  ]);

  // 사례: 실제 데이터 정규화, 없으면 샘플
  const caseItems = normalizeCases(cases);

  // 카테고리 쇼케이스용: 이름이 제목·태그에 걸리는 사례에서 대표 사진 한 장을 가져옴
  // (cases에 category_id가 없어 이름으로 매칭. 못 찾으면 사진 없이 컬러+타이포만 노출)
  const showcaseItems = categories.map((c) => {
    const hit = caseItems.find(
      (x) => x.title === c.name || (x.tags ?? []).includes(c.name)
    );
    return {
      id: c.id,
      name: c.name,
      image: hit?.image ?? null,
      tagline: hit?.description ?? "행사 목적에 맞춰 장비 구성부터 맞춤 제작까지",
    };
  });

  // 쇼츠(인기 장비): 실제 제품 정규화, 없으면 샘플
  const shortsItems =
    products.length > 0
      ? products.map((p) => ({
          id: p.id,
          name: p.name,
          thumbnail: p.thumbnail,
          videoUrl: p.video_url,
          isSample: false,
        }))
      : SAMPLE_PRODUCTS.map((p) => ({
          id: p.id,
          name: p.name,
          bg: p.bg,
          isSample: true,
        }));

  return (
    <>
      <SiteHeader />
      <main>
        {/* 히어로 */}
        <HeroSlider banners={banners} mode={settings.hero_mode || "static"} />

        {/* 인트로 (히어로 다음, 스크롤하면 처음 만나는 소개 블록) */}
        <section className="bg-[#f4f4f5]">
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

        {/* 카테고리 — 왼쪽 소개 + 오른쪽 2×3 카드 그리드 */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <CategoryGrid items={showcaseItems} />
        </section>

        {/* 인기 장비 (쇼츠 스타일 세로 카드 가로 스크롤) */}
        <section className="py-14">
          <div className="mx-auto max-w-6xl px-5">
            <p className="font-heading text-sm font-bold tracking-[0.2em] text-primary">
              POPULAR PICK
            </p>
            <h2 className="mt-3 text-balance text-2xl font-bold leading-snug text-ink sm:text-3xl">
              지금 가장 많이 찾는 장비
            </h2>
            <p className="mt-2 text-ink/60 sm:text-lg">
              현장에서 반응이 좋은 장비를 영상으로 확인해 보세요.
            </p>
            <div className="mt-8">
              <ShortsRow items={shortsItems} />
            </div>
          </div>
        </section>

        {/* 행사 사례 (가로 스크롤 + 클릭 시 상세 모달) */}
        <section className="py-14">
          <div className="mx-auto max-w-6xl px-5">
            <p className="font-heading text-sm font-bold tracking-[0.2em] text-primary">
              REAL STORY
            </p>
            <h2 className="mt-3 text-balance text-2xl font-bold leading-snug text-ink sm:text-3xl">
              이벤토리가 채운 현장
            </h2>
            <p className="mt-2 text-ink/60 sm:text-lg">
              팝업스토어부터 지역축제까지, 실제로 진행한 행사 기록입니다.
            </p>
            <div className="mt-8">
              <CaseGallery
                items={caseItems}
                mode={settings.home_stories_mode || "off"}
                speed={settings.home_stories_speed || 30}
              />
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
    </>
  );
}
