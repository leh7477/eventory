import Link from "next/link";
import { SITE } from "@/lib/constants";

export default function SiteFooter() {
  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <p className="font-heading text-2xl font-extrabold tracking-tight text-white">
            EVENTORY
          </p>
          <p className="mt-3 text-sm">{SITE.tagline}</p>
        </div>

        <div className="text-sm">
          <p className="mb-3 font-semibold text-white">바로가기</p>
          <ul className="space-y-2">
            <li>
              <Link href="/products" className="hover:text-primary">
                장비 목록
              </Link>
            </li>
            <li>
              <Link href="/cases" className="hover:text-primary">
                행사사례
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-primary">
                회사소개
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="mb-3 font-semibold text-white">문의</p>
          <p>
            전화{" "}
            <a
              href={`tel:${SITE.phone}`}
              className="font-semibold text-accent hover:underline"
            >
              {SITE.phone}
            </a>
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-white/40">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
