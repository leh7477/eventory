import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CaseCard from "@/components/CaseCard";
import { getCases } from "@/lib/data";

export const revalidate = 0;

export const metadata = {
  title: "행사 사례 | Eventory",
};

export default async function CasesPage() {
  const cases = await getCases();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <header className="mb-8">
          <p className="font-heading text-sm font-bold tracking-[0.25em] text-primary">
            GALLERY
          </p>
          <h1 className="mt-1 text-3xl font-bold text-ink sm:text-4xl">행사 사례</h1>
          <p className="mt-3 text-sm text-ink/60">
            다양한 행사와 이벤트에서 함께한 Eventory의 현장입니다.
          </p>
        </header>

        {cases.length > 0 ? (
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
            {cases.map((item) => (
              <CaseCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink/15 py-24 text-center text-sm text-ink/50">
            행사 사례가 곧 업데이트됩니다.
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
