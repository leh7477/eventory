/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 밝고 화사한 이벤트 테마
        primary: {
          DEFAULT: "#FF5470", // 코랄 로즈 (브랜드/버튼)
          dark: "#E63E5C",
          light: "#FFE4EA",
        },
        accent: "#FFB627", // 선샤인 옐로우 (포인트)
        cream: "#FFF7F3", // 부드러운 섹션 배경
        ink: "#2B2233", // 텍스트 / 딥 앵커
      },
      fontFamily: {
        sans: ["var(--font-pretendard)", "sans-serif"],
        heading: ["var(--font-pretendard)", "sans-serif"],
        logo: ["var(--font-poppins)", "sans-serif"],
        handwriting: ["var(--font-handwriting)", "var(--font-pretendard)", "cursive"],
      },
      aspectRatio: {
        "4/3": "4 / 3",
      },
      backgroundImage: {
        festive: "linear-gradient(120deg, #FF7A59 0%, #FF4D8D 100%)",
      },
    },
  },
  plugins: [],
};
