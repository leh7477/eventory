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
  if (!product) return { title: "장비 | 이벤트랜드" };

  // 검색 노출용 자동 생성 — 사례 상세(app/cases/[id])와 같은 방식.
  // 관리자에서 따로 입력하는 값이 없으므로 장비명으로 조합한다.
  const n = product.name;
  const title = `${n} 렌탈·대여·임대 | 팝업스토어·전시회·박람회 이벤트 장비 맞춤 제작`;
  const desc =
    `${product.description ? product.description + " — " : ""}` +
    `${n} 렌탈·대여와 브랜드 랩핑 맞춤 제작. 팝업스토어, 전시회·전시장, 박람회, ` +
    `기업행사, 지역축제 등 행사장에서 활용되는 ${n}렌탈, ${n}대여, ${n}임대, ` +
    `${n}제작 문의는 이벤트랜드(EVENT LAND).`;
  const cover = product.thumbnail;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "website",
      images: cover ? [{ url: cover }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }) {
  const product = await getProductById(params.id);
  if (!product || product.is_active === false) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1440px] px-5 py-10 pb-28">
        <nav className="mb-6 text-sm text-ink/50">
          <Link href="/products" className="hover:text-primary">
            장비 목록
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* 좌: 갤러리 */}
          <ProductGallery images={product.images} name={product.name} />

          {/* 우: 정보 */}
          <div>
            {product.categoryName && (
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {product.categoryName}
              </span>
            )}
            <h1 className="mt-3 text-3xl font-bold text-ink">{product.name}</h1>

            {product.description && (
              <p className="mt-5 whitespace-pre-line leading-relaxed text-ink/80">
                {product.description}
              </p>
            )}

            {product.specs && (
              <div className="mt-8">
                <h2 className="text-sm font-bold text-ink">스펙 정보</h2>
                <p className="mt-2 whitespace-pre-line rounded-xl bg-cream p-4 text-sm leading-relaxed text-ink/80">
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
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-5 py-3">
          <a
            href={`tel:${SITE.phone}`}
            className="text-sm font-medium text-ink"
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
