import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CaseGallery from "@/components/CaseGallery";
import { getCases, getCategories } from "@/lib/data";
import { SAMPLE_CASES } from "@/lib/samples";

export const revalidate = 0;

export const metadata = {
  title: "Stories | Eventory",
};

export default async function CasesPage({ searchParams }) {
  const activeCategory = searchParams?.category ?? null;

  const [cases, categories] = await Promise.all([getCases(), getCategories()]);

  const usingSamples = cases.length === 0;

  let items;
  if (usingSamples) {
    // 실제 데이터가 없을 때만 데모 샘플 (필터 무관하게 전부 표시)
    items = SAMPLE_CASES.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      image: s.images[0],
      tags: s.tags,
    }));
  } else {
    const filtered = activeCategory
      ? cases.filter((c) => String(c.category_id) === String(activeCategory))
      : cases;
    items = filtered.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      image: c.image_url,
      tags: c.tags,
    }));
  }

  const activeCategoryName = activeCategory
    ? categories.find((c) => String(c.id) === String(activeCategory))?.name
    : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <header className="mb-8">
          <p className="font-heading text-sm font-bold tracking-[0.25em] text-primary">
            EVENTORY
          </p>
          <h1 className="mt-1 text-3xl font-bold text-ink sm:text-4xl">Stories</h1>
          <p className="mt-3 text-sm text-ink/60">
            다양한 행사와 이벤트에서 함께한 Eventory의 현장입니다. 사진을 클릭하면
            자세히 볼 수 있어요.
          </p>
        </header>

        {/* 카테고리 필터 안내 (필터로 들어왔을 때만) */}
        {activeCategoryName && (
          <div className="mb-8 flex items-center gap-3">
            <span className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-white">
              {activeCategoryName}
            </span>
            <Link href="/cases" className="text-sm text-ink/50 transition hover:text-primary">
              전체 보기 →
            </Link>
          </div>
        )}

        {items.length > 0 ? (
          <CaseGallery items={items} layout="grid" />
        ) : (
          <div className="rounded-xl border border-dashed border-ink/15 py-24 text-center text-sm text-ink/40">
            해당 카테고리에 등록된 사례가 없습니다.
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
