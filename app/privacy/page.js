import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { SITE } from "@/lib/constants";
import {
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_OFFICER,
  COLLECTED_REQUIRED,
  COLLECTED_OPTIONAL,
} from "@/lib/privacy";

export const metadata = {
  title: "개인정보처리방침 | 이벤트랜드",
  description: "이벤트랜드 개인정보처리방침",
};

function Section({ no, title, children }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-lg font-bold text-ink">
        제{no}조 · {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink/70">
        {children}
      </div>
    </section>
  );
}

function Bullets({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-ink/30">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <header className="border-b border-ink/15 pb-6">
          <p className="font-heading text-sm font-bold tracking-[0.25em] text-primary">
            PRIVACY POLICY
          </p>
          <h1 className="mt-1 text-3xl font-bold text-ink sm:text-4xl">
            개인정보처리방침
          </h1>
          <p className="mt-3 text-sm text-ink/60">
            {SITE.nameKo}(이하 &lsquo;회사&rsquo;)는 「개인정보 보호법」에 따라
            이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리할 수
            있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.
          </p>
        </header>

        <div className="mt-8">
          <Section no={1} title="수집하는 개인정보 항목 및 수집 방법">
            <p>회사는 견적 문의 접수를 위해 아래 항목을 수집합니다.</p>
            <p className="font-medium text-ink">필수 항목</p>
            <Bullets items={COLLECTED_REQUIRED} />
            <p className="font-medium text-ink">선택 항목</p>
            <Bullets items={COLLECTED_OPTIONAL} />
            <p>
              수집 방법: 홈페이지 견적 문의 양식을 통한 이용자의 직접 입력
            </p>
            <p>
              회사는 광고 식별자, 행태정보 등을 수집하는 별도의 자동 수집 장치를
              운영하지 않습니다.
            </p>
          </Section>

          <Section no={2} title="개인정보의 수집 및 이용 목적">
            <Bullets
              items={[
                "견적 산출 및 회신, 상담 진행",
                "계약의 체결과 이행 (장비 대여·제작, 납품 및 회수 일정 조율)",
                "대금 청구 및 정산",
              ]}
            />
          </Section>

          <Section no={3} title="개인정보의 보유 및 이용기간">
            <p>
              회사는 수집·이용 목적이 달성된 후에는 해당 정보를 지체 없이
              파기합니다. 다만 아래의 경우 명시한 기간 동안 보관합니다.
            </p>
            <Bullets
              items={[
                "견적 문의 정보: 문의 접수일로부터 3년",
                "계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)",
                "대금결제 및 재화 등의 공급에 관한 기록: 5년 (동법)",
                "소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (동법)",
              ]}
            />
          </Section>

          <Section no={4} title="개인정보의 제3자 제공">
            <p>
              회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만
              법령에 특별한 규정이 있거나 수사기관이 법령에 정해진 절차에 따라
              요구하는 경우는 예외로 합니다.
            </p>
          </Section>

          <Section no={5} title="개인정보 처리업무의 위탁">
            <p>
              회사는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리업무를
              위탁하고 있습니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="border-y border-ink/15 bg-ink/[0.03] text-left text-ink">
                    <th className="px-3 py-2 font-bold">수탁업체</th>
                    <th className="px-3 py-2 font-bold">위탁업무</th>
                  </tr>
                </thead>
                <tbody className="text-ink/70">
                  <tr className="border-b border-ink/10">
                    <td className="px-3 py-2">Supabase, Inc.</td>
                    <td className="px-3 py-2">데이터베이스 보관 및 운영</td>
                  </tr>
                  <tr className="border-b border-ink/10">
                    <td className="px-3 py-2">Oracle Cloud</td>
                    <td className="px-3 py-2">서버(호스팅) 운영</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              위탁계약 시 개인정보의 안전한 관리에 관한 사항을 계약서 등에
              명시하고, 수탁자가 개인정보를 안전하게 처리하는지 감독합니다.
            </p>
          </Section>

          <Section no={6} title="정보주체와 법정대리인의 권리·의무 및 행사방법">
            <p>
              이용자는 언제든지 자신의 개인정보에 대해 아래 권리를 행사할 수
              있습니다.
            </p>
            <Bullets
              items={[
                "개인정보 열람 요구",
                "오류가 있을 경우 정정 요구",
                "삭제 요구",
                "처리정지 요구",
              ]}
            />
            <p>
              권리 행사는 제9조의 개인정보 보호책임자에게 서면, 전화 또는
              이메일로 요청하실 수 있으며, 회사는 지체 없이 조치하겠습니다.
            </p>
          </Section>

          <Section no={7} title="개인정보의 파기절차 및 방법">
            <p>
              보유기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이
              파기합니다. 전자적 파일 형태의 정보는 복구·재생할 수 없는 기술적
              방법으로 삭제하며, 종이에 출력된 정보는 분쇄하거나 소각합니다.
            </p>
          </Section>

          <Section no={8} title="개인정보의 안전성 확보조치">
            <Bullets
              items={[
                "개인정보 취급자를 최소한으로 한정하고 접근 권한을 차등 부여",
                "관리자 페이지 접근 시 로그인 인증 및 일정 시간 미사용 시 자동 로그아웃",
                "개인정보가 포함된 데이터는 인가된 계정만 조회할 수 있도록 데이터베이스 접근 통제",
                "정보 전송 구간 암호화(HTTPS) 적용",
                "비밀번호는 복호화가 불가능한 방식으로 암호화하여 저장",
              ]}
            />
          </Section>

          <Section no={9} title="개인정보 보호책임자">
            <p>
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
              처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 아래와 같이
              개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="rounded-lg border border-ink/10 bg-ink/[0.02] px-4 py-3">
              <Bullets
                items={[
                  `성명: ${PRIVACY_OFFICER.name}`,
                  `직책: ${PRIVACY_OFFICER.position}`,
                  `연락처: ${SITE.phone}`,
                  `이메일: ${SITE.email}`,
                ]}
              />
            </div>
            <p>
              개인정보 침해에 대한 신고나 상담이 필요하신 경우 아래 기관에
              문의하실 수 있습니다.
            </p>
            <Bullets
              items={[
                "개인정보침해 신고센터 (privacy.kisa.or.kr / 국번없이 118)",
                "개인정보 분쟁조정위원회 (kopico.go.kr / 1833-6972)",
                "대검찰청 사이버수사과 (spo.go.kr / 국번없이 1301)",
                "경찰청 사이버수사국 (ecrm.police.go.kr / 국번없이 182)",
              ]}
            />
          </Section>

          <Section no={10} title="개인정보처리방침의 변경">
            <p>
              이 개인정보처리방침은 {PRIVACY_EFFECTIVE_DATE}부터 적용됩니다.
              법령·정책 또는 보안기술의 변경에 따라 내용의 추가·삭제 및 수정이
              있을 경우에는 변경사항의 시행 7일 전부터 홈페이지를 통해 공지하겠습니다.
            </p>
          </Section>

          <div className="mt-12 rounded-lg border border-ink/10 bg-cream px-5 py-4 text-sm text-ink/60">
            <p className="font-bold text-ink">문의</p>
            <p className="mt-1">
              개인정보 처리와 관련한 문의는 {SITE.phone} 또는 {SITE.email} 로
              연락해 주시기 바랍니다.
            </p>
            <p className="mt-3 text-xs text-ink/45">
              시행일자: {PRIVACY_EFFECTIVE_DATE}
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
