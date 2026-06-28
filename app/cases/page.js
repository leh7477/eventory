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

  const tabs = [{ id: null, name: "전체" }, ...categories];

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

        {/* 카테고리 탭 */}
        {categories.length > 0 && (
          <div className="-mx-5 mb-8 overflow-x-auto px-5">
            <div className="flex gap-2">
              {tabs.map((tab) => {
                const active = (tab.id ?? null) === (activeCategory ?? null);
                const href = tab.id ? `/cases?category=${tab.id}` : "/cases";
                return (
                  <Link
                    key={tab.id ?? "all"}
                    href={href}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-ink text-white"
                        : "border border-ink/15 text-ink hover:border-primary"
                    }`}
                  >
                    {tab.name}
                  </Link>
                );
              })}
            </div>
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
