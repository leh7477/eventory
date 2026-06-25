import { Poppins, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

export const metadata = {
  title: "Eventory | 이벤트 장비 렌탈",
  description:
    "가챠머신, 룰렛, 사격게임기 등 이벤트·행사 장비 렌탈 전문 Eventory. 견적 문의 환영합니다.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${poppins.variable} ${notoSansKr.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
