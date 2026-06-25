import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import QuoteButton from "@/components/QuoteButton";
import { SITE } from "@/lib/constants";

export const metadata = {
  title: "회사소개 | Eventory",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* 인트로 */}
        <section className="bg-navy text-white">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center">
            <p className="font-heading text-lg tracking-[0.35em] text-gold">
              ABOUT EVENTORY
            </p>
            <h1 className="mt-4 text-balance text-3xl font-bold sm:text-4xl">
              이벤트의 모든 순간을 채우는 장비 파트너
            </h1>
            <p className="mt-6 text-balance leading-relaxed text-white/75">
              Eventory는 가챠머신, 에어볼추첨기, 룰렛, 사격게임기 등 다양한 이벤트
              장비를 보유한 렌탈 전문 업체입니다. 기업 행사, 축제, 프로모션, 매장
              이벤트까지 — 현장에 꼭 맞는 장비를 빠르고 깔끔하게 제공합니다.
            </p>
          </div>
        </section>

        {/* 강점 */}
        <section className="mx-auto max-w-5xl px-5 py-16">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                t: "다양한 장비 보유",
                d: "트렌디한 이벤트 장비를 폭넓게 보유해 행사 콘셉트에 맞게 제안합니다.",
              },
              {
                t: "빠른 견적·상담",
                d: "원하는 일정과 장비만 알려주시면 신속하게 견적을 안내드립니다.",
              },
              {
                t: "깔끔한 설치·운영",
                d: "현장 세팅부터 운영까지 매끄럽게 진행되도록 지원합니다.",
              },
            ].map((item) => (
              <div
                key={item.t}
                className="rounded-2xl border border-navy/10 p-6"
              >
                <h3 className="font-bold text-navy">{item.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  {item.d}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 연락 */}
        <section className="bg-navy/[0.03]">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center">
            <h2 className="text-2xl font-bold text-navy">문의하기</h2>
            <p className="mt-3 text-navy/70">
              전화 또는 견적 문의로 편하게 연락 주세요.
            </p>
            <p className="mt-4 text-2xl font-bold text-navy">
              <a href={`tel:${SITE.phone}`} className="hover:text-gold">
                {SITE.phone}
              </a>
            </p>
            <div className="mt-8 flex justify-center">
              <QuoteButton />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
