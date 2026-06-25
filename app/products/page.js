import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ProductCard from "@/components/ProductCard";
import { getCategories, getProducts } from "@/lib/data";

export const revalidate = 0;

export const metadata = {
  title: "장비 목록 | Eventory",
};

export default async function ProductsPage({ searchParams }) {
  const activeCategory = searchParams?.category ?? null;

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ categoryId: activeCategory }),
  ]);

  const tabs = [{ id: null, name: "전체" }, ...categories];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <header className="mb-8">
          <p className="font-heading text-sm tracking-[0.3em] text-gold">
            EQUIPMENT
          </p>
          <h1 className="mt-1 text-3xl font-bold text-navy sm:text-4xl">장비 목록</h1>
        </header>

        {/* 카테고리 탭 */}
        <div className="-mx-5 mb-8 overflow-x-auto px-5">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const active = (tab.id ?? null) === (activeCategory ?? null);
              const href = tab.id ? `/products?category=${tab.id}` : "/products";
              return (
                <Link
                  key={tab.id ?? "all"}
                  href={href}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-navy text-white"
                      : "border border-navy/15 text-navy hover:border-navy"
                  }`}
                >
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 제품 그리드 */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-navy/15 py-24 text-center text-sm text-navy/50">
            해당 카테고리에 등록된 장비가 없습니다.
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
