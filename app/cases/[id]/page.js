import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CaseTopGallery from "@/components/CaseTopGallery";
import QuoteButton from "@/components/QuoteButton";
import { getCaseById } from "@/lib/data";
import { getSampleCaseById, getMachineSpecs } from "@/lib/samples";

export const revalidate = 0;

async function resolveCase(id) {
  const sample = getSampleCaseById(id);
  if (sample) return sample;
  return await getCaseById(id);
}

export async function generateMetadata({ params }) {
  const item = await resolveCase(params.id);
  return { title: item ? `${item.title} | Stories` : "Stories | Eventory" };
}

export default async function CaseDetailPage({ params }) {
  const item = await resolveCase(params.id);
  if (!item) notFound();

  const images = item.images ?? [];
  const specs = item.specs ?? getMachineSpecs(item.title);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link href="/cases" className="text-sm text-ink/50 transition hover:text-primary">
          ← Stories
        </Link>

        {/* 상단: 대표사진(+썸네일) / 행사 정보 */}
        <div className="mt-4 grid gap-8 lg:grid-cols-2">
          <CaseTopGallery images={images} title={item.title} />

          <div className="flex h-full flex-col">
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{item.title}</h1>
            {item.description && (
              <p className="mt-2 text-base text-ink/60 sm:text-lg">{item.description}</p>
            )}

            {specs && specs.length > 0 && (
              <div className="mt-6 overflow-hidden rounded-xl border border-ink/10">
                <div className="border-b border-ink/10 bg-ink/[0.03] px-4 py-2.5 text-sm font-bold text-ink">
                  장비 정보
                </div>
                <dl className="divide-y divide-ink/5 text-sm">
                  {specs.map((s) => (
                    <div key={s.label} className="flex px-4 py-2.5">
                      <dt className="w-24 shrink-0 text-ink/50">{s.label}</dt>
                      <dd className="text-ink/90">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="mt-7 rounded-xl bg-cream p-5 lg:mt-auto">
              <p className="text-sm font-bold text-ink">이런 행사를 준비 중이신가요?</p>
              <p className="mt-1 text-sm text-ink/60">
                원하는 장비와 일정을 알려주시면 빠르게 견적을 안내드립니다.
              </p>
              <div className="mt-4">
                <QuoteButton variant="dark" />
              </div>
            </div>
          </div>
        </div>

        {/* 하단: 현장 사진 — 위에서 아래로 쭉 */}
        {images.length > 0 && (
          <section className="mt-16 border-t border-ink/10 pt-12">
            <p className="text-center text-base font-bold text-ink">
              현장 스케치
            </p>
            <div className="mx-auto mt-8 max-w-2xl space-y-3">
              {images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt={`${item.title} 현장 ${i + 1}`}
                  className="w-full rounded-lg"
                />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
