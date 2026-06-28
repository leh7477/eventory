import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import QuoteButton from "@/components/QuoteButton";
import { SITE } from "@/lib/constants";

export const metadata = {
  title: "회사소개 | Eventory",
};

const POINTS = [
  {
    t: "맞춤 장비 제안",
    d: "행사 성격·공간·참여 인원을 분석해 가장 효과적인 장비를 큐레이션합니다.",
  },
  {
    t: "브랜드 맞춤 제작",
    d: "로고·컬러·디자인 랩핑으로 행사 콘셉트에 꼭 맞게 연출해 드립니다.",
  },
  {
    t: "설치부터 운영까지",
    d: "현장 세팅·운영·철수까지 원스톱으로 지원해 행사에만 집중하실 수 있습니다.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-12">
        {/* 인트로 */}
        <header className="max-w-2xl">
          <p className="font-heading text-sm font-bold tracking-[0.25em] text-primary">
            ABOUT EVENTORY
          </p>
          <h1 className="mt-2 font-heading text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
            EVENT <span className="text-primary">+</span> STORY
          </h1>
          <p className="mt-6 leading-relaxed text-ink/70">
            단순한 장비 대여를 넘어 행사 성격과 공간, 참여 인원에 맞는 장비를
            제안하며,{" "}
            <br className="hidden sm:block" />
            철저한 장비 관리와 신속한 대응으로 고객이 행사에만 집중할 수 있는 환경을
            만들어드립니다.
          </p>
          <p className="mt-3 leading-relaxed text-ink/70">
            성공적인 이벤트를 위한 경험과 솔루션, 그것이 EVENTORY가 추구하는
            가치입니다.
          </p>
        </header>

        {/* 강점 */}
        <section className="mt-12 grid gap-5 sm:grid-cols-3">
          {POINTS.map((item, i) => (
            <div
              key={item.t}
              className="rounded-2xl border border-ink/10 p-6 transition hover:border-primary/40"
            >
              <span className="font-heading text-sm font-bold text-primary">
                0{i + 1}
              </span>
              <h3 className="mt-2 font-bold text-ink">{item.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{item.d}</p>
            </div>
          ))}
        </section>

        {/* 연락 */}
        <section className="mt-12 rounded-2xl bg-cream px-6 py-9 text-center">
          <h2 className="text-lg font-bold text-ink">문의하기</h2>
          <p className="mt-1.5 text-sm text-ink/60">
            전화 또는 견적 문의로 편하게 연락 주세요.
          </p>
          <p className="mt-2 text-xl font-bold text-ink">
            <a href={`tel:${SITE.phone}`} className="hover:text-primary">
              {SITE.phone}
            </a>
          </p>
          <div className="mt-5 flex justify-center">
            <QuoteButton variant="dark" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
