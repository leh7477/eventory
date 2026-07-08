import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import QuoteSheet from "@/components/admin/QuoteSheet";

export const revalidate = 0;

export default async function QuotePage({ params }) {
  const admin = createAdminClient();
  const { data: inquiry } = await admin
    .from("inquiries")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!inquiry) notFound();

  return (
    <div className="max-w-3xl">
      <div className="print-hide">
        <Link
          href="/admin/inquiries"
          className="text-sm text-ink/50 transition hover:text-primary"
        >
          ← 견적 문의
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">견적서 작성</h1>
        <p className="mt-1 text-sm text-ink/50">
          문의 내용이 자동으로 채워졌습니다. 품목과 금액을 입력한 뒤
          인쇄(PDF 저장)하세요.
        </p>
      </div>

      <div className="mt-6">
        <QuoteSheet inquiry={inquiry} />
      </div>
    </div>
  );
}
