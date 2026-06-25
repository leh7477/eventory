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
        navy: "#0D0F2B",
        gold: "#FFD23F",
        ink: "#111111",
      },
      fontFamily: {
        heading: ["var(--font-bebas)", "sans-serif"],
        sans: ["var(--font-noto-sans-kr)", "sans-serif"],
      },
      aspectRatio: {
        "4/3": "4 / 3",
      },
    },
  },
  plugins: [],
};
