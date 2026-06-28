import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 0;

export default async function DashboardPage() {
  const admin = createAdminClient();

  const [products, cases, inquiries] = await Promise.all([
    admin.from("products").select("*", { count: "exact", head: true }),
    admin.from("cases").select("*", { count: "exact", head: true }),
    admin
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false),
  ]);

  const cards = [
    { label: "등록 쇼츠", value: products.count ?? 0, href: "/admin/products" },
    { label: "행사 사례", value: cases.count ?? 0, href: "/admin/cases" },
    {
      label: "미확인 견적 문의",
      value: inquiries.count ?? 0,
      href: "/admin/inquiries",
      highlight: (inquiries.count ?? 0) > 0,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">대시보드</h1>
      <p className="mt-1 text-sm text-ink/50">Eventory 관리자 페이지입니다.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-ink/10 bg-white p-6 transition hover:border-primary/40 hover:shadow-sm"
          >
            <p className="text-sm text-ink/50">{c.label}</p>
            <p
              className={`mt-2 text-4xl font-extrabold ${
                c.highlight ? "text-primary" : "text-ink"
              }`}
            >
              {c.value}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
