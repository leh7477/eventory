import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HeroSlider from "@/components/HeroSlider";
import ProductCard from "@/components/ProductCard";
import CaseCard from "@/components/CaseCard";
import QuoteButton from "@/components/QuoteButton";
import { SITE } from "@/lib/constants";
import { getActiveBanners, getCategories, getProducts, getCases } from "@/lib/data";

export const revalidate = 0;

export default async function Home() {
  const [banners, categories, products, cases] = await Promise.all([
    getActiveBanners(),
    getCategories(),
    getProducts({ limit: 6 }),
    getCases({ limit: 4 }),
  ]);

  return (
    <>
      <SiteHeader />
      <main>
        {/* 히어로 */}
        <HeroSlider banners={banners} />

        {/* 카테고리 */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <SectionTitle eyebrow="CATEGORY" title="장비 카테고리" />
          <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.id}`}
                className="rounded-full border border-navy/15 px-5 py-2.5 text-sm font-medium text-navy transition hover:border-navy hover:bg-navy hover:text-white"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>

        {/* 인기 장비 */}
        <section className="bg-navy/[0.03] py-16">
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex items-end justify-between">
              <SectionTitle eyebrow="POPULAR" title="인기 장비" align="left" />
              <Link
                href="/products"
                className="text-sm font-medium text-navy hover:text-gold"
              >
                전체보기 →
              </Link>
            </div>
            {products.length > 0 ? (
              <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <EmptyNote text="등록된 장비가 곧 업데이트됩니다." />
            )}
          </div>
        </section>

        {/* 행사사례 미리보기 */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-end justify-between">
            <SectionTitle eyebrow="GALLERY" title="행사 사례" align="left" />
            <Link
              href="/cases"
              className="text-sm font-medium text-navy hover:text-gold"
            >
              더보기 →
            </Link>
          </div>
          {cases.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {cases.map((item) => (
                <Link key={item.id} href="/cases" className="group block">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-navy/5">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy to-[#1b1f4d]">
                        <span className="font-heading tracking-widest text-gold/60">
                          EVENTORY
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-ink">{item.title}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyNote text="행사 사례가 곧 업데이트됩니다." />
          )}
        </section>

        {/* CTA */}
        <section className="bg-navy">
          <div className="mx-auto max-w-6xl px-5 py-20 text-center text-white">
            <p className="font-heading text-lg tracking-[0.3em] text-gold">
              CONTACT
            </p>
            <h2 className="mt-3 text-balance text-2xl font-bold sm:text-4xl">
              행사 준비, 무엇이 필요하세요?
            </h2>
            <p className="mt-4 text-white/70">
              원하는 장비와 일정을 알려주시면 빠르게 견적을 보내드립니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <QuoteButton />
              <a
                href={`tel:${SITE.phone}`}
                className="rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition hover:border-gold hover:text-gold"
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

function SectionTitle({ eyebrow, title, align = "center" }) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <p className="font-heading text-sm tracking-[0.3em] text-gold">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold text-navy sm:text-3xl">{title}</h2>
    </div>
  );
}

function EmptyNote({ text }) {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-navy/15 py-16 text-center text-sm text-navy/50">
      {text}
    </div>
  );
}
