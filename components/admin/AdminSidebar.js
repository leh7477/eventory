"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin/dashboard", label: "대시보드" },
  { href: "/admin/banner", label: "메인 배너" },
  { href: "/admin/categories", label: "카테고리" },
  { href: "/admin/products", label: "중단 배너" },
  { href: "/admin/cases", label: "Stories" },
  { href: "/admin/inquiries", label: "견적 문의" },
];

export default function AdminSidebar({ email }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin");
    router.refresh();
  };

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-ink/10 bg-white">
      <div className="px-5 py-5">
        <Link href="/admin/dashboard" className="font-logo text-xl font-extrabold tracking-tight text-ink">
          EVENTORY
        </Link>
        <p className="mt-0.5 text-xs font-semibold tracking-widest text-primary">ADMIN</p>
      </div>

      <nav className="flex-1 px-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-0.5 block rounded-md px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-ink text-white" : "text-ink/70 hover:bg-ink/5"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink/10 p-4">
        <p className="truncate text-xs text-ink/50">
          {(email ?? "").replace("@eventory.local", "")}
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-2 w-full rounded-md border border-ink/15 py-2 text-xs font-medium text-ink/70 transition hover:bg-ink/5"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
