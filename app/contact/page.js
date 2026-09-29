import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import QuoteForm from "@/components/QuoteForm";

export const metadata = {
  title: "견적 문의 | 이벤트 장비 렌탈·대여·제작 이벤트랜드",
  description:
    "가챠머신, 룰렛, 에어볼추첨기 등 이벤트 장비 렌탈·대여·임대·제작 견적 문의. 팝업스토어, 전시회·전시장, 박람회, 기업행사, 지역축제 등 행사장 일정과 장비를 남겨주시면 빠르게 회신드립니다.",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <header className="mb-8">
          <p className="font-heading text-sm font-bold tracking-[0.25em] text-primary">
            CONTACT
          </p>
          <h1 className="mt-1 text-3xl font-bold text-ink sm:text-4xl">견적 문의</h1>
          <p className="mt-3 text-sm text-ink/60">
            아래 정보를 입력해 주시면 빠르게 견적을 안내드리겠습니다. (• 필수)
          </p>
        </header>

        <QuoteForm />
      </main>
      <SiteFooter />
    </>
  );
}
