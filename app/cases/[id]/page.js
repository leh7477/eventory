import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CaseTopGallery from "@/components/CaseTopGallery";
import QuoteButton from "@/components/QuoteButton";
import { getCaseById } from "@/lib/data";
import { getSampleCaseById, getMachineSpecs, parseSpecsText } from "@/lib/samples";

export const revalidate = 0;

async function resolveCase(id) {
  const sample = getSampleCaseById(id);
  if (sample) return sample;
  return await getCaseById(id);
}

export async function generateMetadata({ params }) {
  const item = await resolveCase(params.id);
  if (!item) return { title: "Stories | Eventory" };

  const metaTitle =
    item.seoTitle ||
    `${item.title} 렌탈·대여·임대 | 기업행사·축제·팝업스토어 이벤트 맞춤 제작`;
  const desc =
    item.seoDescription ||
    item.description ||
    `${item.title} 행사 현장 - 이벤토리(EVENTORY) 이벤트 장비 렌탈 사례`;
  const cover = item.images?.[0];

  return {
    title: metaTitle,
    description: desc,
    openGraph: {
      title: metaTitle,
      description: desc,
      type: "article",
      images: cover ? [{ url: cover }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: desc,
      images: cover ? [cover] : [],
    },
  };
}

// 문자열 해시 → 사례마다 일정한 버전 선택 (페이지마다 문단이 조금씩 달라짐)
function hashIndex(str, mod) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}

// 장비명 기반 SEO 안내 문단 (검색어 변형 포함) — 자동 생성, 버전 순환
function seoBody(name, id) {
  const variants = [
    [
      `행사의 인상은 참여자가 직접 경험한 순간에서 만들어집니다. ${name}는 관람객의 발길을 붙잡고 자연스러운 참여와 촬영을 이끌어내는 이벤트 콘텐츠로, 팝업스토어와 기업 행사·박람회, 전시 부스, 지역 축제, 브랜드 프로모션 등 다양한 현장에서 활용됩니다.`,
      `이벤토리(EVENTORY)는 행사 성격과 공간, 참여 인원에 맞춰 ${name} 렌탈·대여 구성을 제안하고, 브랜드 로고와 컬러를 입힌 랩핑(풀 커스텀)으로 ${name} 맞춤 제작까지 진행합니다. 대형 ${name} 제작이 필요한 경우도 상담 가능합니다.`,
      `모든 장비는 사전 점검을 거쳐 준비되며, 브랜드 아이덴티티를 살린 디자인으로 행사장의 몰입도를 높여드립니다. ${name}렌탈, ${name}대여, ${name}임대, ${name}제작 문의는 아래 견적 문의로 편하게 남겨주세요.`,
    ],
    [
      `기억에 남는 행사는 참여자가 직접 겪은 경험에서 시작됩니다. ${name}는 부스로 사람을 모으고 대기 줄까지 콘텐츠로 만들어 주는 참여형 아이템으로, 신제품 런칭과 오픈 이벤트, 사내 행사, 페스티벌 등 폭넓은 현장에 어울립니다.`,
      `이벤토리는 ${name} 대여부터 시작해 행사 콘셉트에 맞춘 브랜드 래핑과 ${name} 맞춤 제작까지 한 번에 준비합니다. 표준형 ${name}렌탈은 물론 대형 사이즈나 특수 규격의 ${name}제작도 문의하실 수 있습니다.`,
      `장비는 출고 전 점검을 마쳐 현장에서 안정적으로 운영되며, 공간과 예산에 맞는 구성으로 제안드립니다. ${name}렌탈, ${name}대여, ${name}임대, ${name}제작이 필요하시면 견적 문의로 알려 주세요.`,
    ],
    [
      `좋은 행사는 규모보다 참여자가 남기는 경험으로 완성됩니다. ${name}는 관람객이 직접 참여하고 사진을 남기게 만드는 이벤트 장비로, 팝업스토어와 전시회, 기업 프로모션, 지역 축제 현장에서 꾸준히 활용되고 있습니다.`,
      `이벤토리(EVENTORY)는 ${name} 렌탈·대여는 물론 브랜드 로고와 디자인을 입힌 커스텀 래핑, 그리고 ${name} 맞춤 제작을 함께 제공합니다. 행사 규모가 크다면 대형 ${name} 제작으로도 대응합니다.`,
      `모든 ${name}는 사전 점검 후 준비되어 현장에서 안정적으로 운영됩니다. ${name}렌탈, ${name}대여, ${name}임대, ${name}제작 관련 문의는 아래 견적 문의로 남겨 주세요.`,
    ],
  ];
  return variants[hashIndex(id || name, variants.length)];
}

export default async function CaseDetailPage({ params }) {
  const item = await resolveCase(params.id);
  if (!item) notFound();

  const images = item.images ?? [];
  // 사례에 입력된 스펙(텍스트)을 우선, 없으면 장비 기본 스펙
  const specs =
    (item.specs && parseSpecsText(item.specs)) || getMachineSpecs(item.title);

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

        {/* 검색 노출용 안내 문단 (장비명 기반 자동) */}
        <section className="mt-16 border-t border-ink/10 pt-8">
          <details className="mx-auto max-w-3xl">
            <summary className="cursor-pointer list-none text-center text-sm font-bold text-ink/60 hover:text-ink">
              [+] {item.title} 렌탈·대여 & 맞춤 제작 안내
            </summary>
            <div className="mt-4 space-y-2.5 text-xs leading-relaxed text-ink/70">
              {seoBody(item.title, item.id).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </details>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
