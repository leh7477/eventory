import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import QuoteForm from "@/components/QuoteForm";

export const metadata = {
  title: "견적 문의 | Eventory",
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
