import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import InquiriesManager from "@/components/admin/InquiriesManager";

export const revalidate = 0;

const PAGE_SIZE = 20;

export default async function AdminInquiriesPage({ searchParams }) {
  const admin = createAdminClient();

  const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ data: inquiries, count }, unreadRes] = await Promise.all([
    admin
      .from("inquiries")
      .select("*", { count: "exact" })
      .order("handled", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .range(from, to),
    admin
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false),
  ]);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const unread = unreadRes.count ?? 0;

  // 페이지 번호 윈도우 (현재 ±2)
  const span = 2;
  const start = Math.max(1, page - span);
  const end = Math.min(totalPages, page + span);
  const nums = [];
  for (let i = start; i <= end; i++) nums.push(i);

  const linkCls = (active) =>
    `flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition ${
      active
        ? "bg-ink font-bold text-white"
        : "border border-ink/15 text-ink/70 hover:bg-ink/5"
    }`;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-ink">견적 문의</h1>
        {unread > 0 && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
            미확인 {unread}
          </span>
        )}
        <span className="text-sm text-ink/40">총 {total}건</span>
      </div>
      <p className="mt-1 text-sm text-ink/50">
        견적 문의 페이지를 통해 접수된 내역입니다. 클릭하면 상세가 열리고 자동으로
        읽음 처리됩니다.
      </p>

      <div className="mt-6">
        <InquiriesManager inquiries={inquiries ?? []} />
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {page > 1 && (
            <Link href={`/admin/inquiries?page=${page - 1}`} className={linkCls(false)}>
              ‹
            </Link>
          )}
          {start > 1 && (
            <>
              <Link href="/admin/inquiries?page=1" className={linkCls(page === 1)}>
                1
              </Link>
              {start > 2 && <span className="px-1 text-ink/30">…</span>}
            </>
          )}
          {nums.map((n) => (
            <Link key={n} href={`/admin/inquiries?page=${n}`} className={linkCls(n === page)}>
              {n}
            </Link>
          ))}
          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className="px-1 text-ink/30">…</span>}
              <Link
                href={`/admin/inquiries?page=${totalPages}`}
                className={linkCls(page === totalPages)}
              >
                {totalPages}
              </Link>
            </>
          )}
          {page < totalPages && (
            <Link href={`/admin/inquiries?page=${page + 1}`} className={linkCls(false)}>
              ›
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
