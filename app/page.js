import { SITE } from "@/lib/constants";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy px-6 text-center text-white">
      <p className="font-heading text-2xl tracking-[0.3em] text-gold">
        EVENTORY
      </p>
      <h1 className="mt-4 text-balance text-3xl font-bold sm:text-4xl">
        {SITE.tagline}
      </h1>
      <p className="mt-4 max-w-md text-balance text-sm text-white/70">
        프로젝트 세팅이 완료되었습니다. 메인 페이지는 3단계에서 제작됩니다.
      </p>
      <span className="mt-10 rounded-full border border-gold/40 px-4 py-1 text-xs text-gold">
        1단계: Next.js + Tailwind + Supabase 세팅 ✓
      </span>
    </main>
  );
}
