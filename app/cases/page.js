import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CaseGallery from "@/components/CaseGallery";
import { getCases } from "@/lib/data";
import { normalizeCases } from "@/lib/samples";

export const revalidate = 0;

export const metadata = {
  title: "행사 사례 | Eventory",
};

export default async function CasesPage() {
  const cases = await getCases();
  const items = normalizeCases(cases);

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
            다양한 행사와 이벤트에서 함께한 Eventory의 현장입니다. 사진을 클릭하면
            자세히 볼 수 있어요.
          </p>
        </header>

        <CaseGallery items={items} layout="grid" />
      </main>
      <SiteFooter />
    </>
  );
}
