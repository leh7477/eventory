import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// 본문/메뉴 등 전역 기본 폰트
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

// 손글씨 — 히어로 한글 헤드라인 전용
const handwriting = localFont({
  src: "./fonts/NanumGeumeunbohwa.ttf",
  variable: "--font-handwriting",
  display: "swap",
});

// 로고 전용 (영문 워드마크)
const poppins = Poppins({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

import { SITE_URL } from "@/lib/constants";
import FloatingContact from "@/components/FloatingContact";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Eventory | 이벤트 장비 렌탈",
    template: "%s",
  },
  description:
    "가챠머신, 룰렛, 사격게임기 등 이벤트·행사 장비 렌탈 전문 Eventory. 견적 문의 환영합니다.",
  openGraph: {
    siteName: "EVENTORY",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${poppins.variable} ${handwriting.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        <FloatingContact />
      </body>
    </html>
  );
}
