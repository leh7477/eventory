import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ProductCard from "@/components/ProductCard";
import { getProducts, getCategories } from "@/lib/data";

export const revalidate = 0;

export const metadata = {
  title: "장비 목록 | 가챠머신·룰렛·에어볼추첨기 이벤트 장비 렌탈 이벤트랜드",
  description:
    "이벤트랜드가 보유한 이벤트 장비 목록입니다. 가챠머신, 룰렛, 에어볼추첨기, 스톱워치 등 렌탈·대여·임대는 물론 브랜드 랩핑 맞춤 제작까지. 팝업스토어, 전시회·전시장, 박람회, 기업행사, 지역축제 등 행사장에 맞는 장비를 확인해보세요.",
};

export default async function ProductsPage({ searchParams }) {
  const activeCategory = searchParams?.category ?? null;

  const [products, categories] = await Promise.all([
    getProducts({ categoryId: activeCategory }),
    getCategories(),
  ]);

  const activeCategoryName = activeCategory
    ? categories.find((c) => String(c.id) === String(activeCategory))?.name
    : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1440px] px-5 py-12">
        <header className="mb-8">
          <p className="font-heading text-sm font-bold tracking-[0.25em] text-primary">
            EVENT LAND
          </p>
          <h1 className="mt-1 text-3xl font-bold text-ink sm:text-4xl">장비 목록</h1>
          <p className="mt-3 text-sm text-ink/60">
            팝업스토어, 전시회·전시장, 박람회, 기업행사, 지역축제 등 행사장에서
            활용되는 이벤트 장비입니다. 장비를 누르면 자세히 볼 수 있어요.
          </p>
        </header>

        {/* 카테고리 필터 안내 (필터로 들어왔을 때만) */}
        {activeCategoryName && (
          <div className="mb-8 flex items-center gap-3">
            <span className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-white">
              {activeCategoryName}
            </span>
            <Link
              href="/products"
              className="text-sm text-ink/50 transition hover:text-primary"
            >
              전체 보기 →
            </Link>
          </div>
        )}

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink/15 py-24 text-center text-sm text-ink/40">
            {activeCategoryName
              ? "해당 카테고리에 등록된 장비가 없습니다."
              : "등록된 장비가 없습니다."}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
