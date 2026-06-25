import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ProductGallery from "@/components/ProductGallery";
import QuoteButton from "@/components/QuoteButton";
import { SITE } from "@/lib/constants";
import { getProductById } from "@/lib/data";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const product = await getProductById(params.id);
  return { title: product ? `${product.name} | Eventory` : "장비 | Eventory" };
}

export default async function ProductDetailPage({ params }) {
  const product = await getProductById(params.id);
  if (!product || product.is_active === false) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10 pb-28">
        <nav className="mb-6 text-sm text-navy/50">
          <Link href="/products" className="hover:text-navy">
            장비 목록
          </Link>
          <span className="mx-2">/</span>
          <span className="text-navy">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* 좌: 갤러리 */}
          <ProductGallery images={product.images} name={product.name} />

          {/* 우: 정보 */}
          <div>
            {product.categoryName && (
              <span className="inline-block rounded-full bg-navy/5 px-3 py-1 text-xs font-medium text-navy/70">
                {product.categoryName}
              </span>
            )}
            <h1 className="mt-3 text-3xl font-bold text-navy">{product.name}</h1>

            {product.description && (
              <p className="mt-5 whitespace-pre-line leading-relaxed text-ink/80">
                {product.description}
              </p>
            )}

            {product.specs && (
              <div className="mt-8">
                <h2 className="text-sm font-bold text-navy">스펙 정보</h2>
                <p className="mt-2 whitespace-pre-line rounded-xl bg-navy/[0.03] p-4 text-sm leading-relaxed text-ink/80">
                  {product.specs}
                </p>
              </div>
            )}

            <div className="mt-8 hidden lg:block">
              <QuoteButton />
            </div>
          </div>
        </div>
      </main>

      {/* 하단 고정 견적 문의 바 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <a
            href={`tel:${SITE.phone}`}
            className="text-sm font-medium text-navy"
          >
            {SITE.phone}
          </a>
          <QuoteButton className="flex-1 max-w-[60%]" />
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
