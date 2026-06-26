import { SITE } from "@/lib/constants";

export default function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-white text-ink/55">
      <div className="mx-auto max-w-6xl px-5 py-5">
        <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:items-baseline sm:justify-between sm:text-left">
          <span className="font-logo text-lg font-extrabold tracking-tight text-ink">
            EVENTORY
          </span>
          <p className="text-xs text-ink/55">
            상호 {SITE.nameKo} · 사업자등록번호 {SITE.bizNumber} · 전화{" "}
            <a href={`tel:${SITE.phone}`} className="text-ink hover:underline">
              {SITE.phone}
            </a>{" "}
            · 이메일{" "}
            <a href={`mailto:${SITE.email}`} className="text-ink hover:underline">
              {SITE.email}
            </a>
          </p>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink/35 sm:text-left">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
