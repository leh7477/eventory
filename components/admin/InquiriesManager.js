"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setInquiryRead,
  deleteInquiry,
} from "@/app/admin/(panel)/inquiries/actions";

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <dt className="w-24 shrink-0 text-ink/50">{label}</dt>
      <dd className="whitespace-pre-line text-ink/90">{value}</dd>
    </div>
  );
}

export default function InquiriesManager({ inquiries }) {
  const router = useRouter();
  const [openId, setOpenId] = useState(null);
  const [pending, startTransition] = useTransition();

  const run = (fn) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const onOpen = (q) => {
    if (openId === q.id) {
      setOpenId(null);
      return;
    }
    setOpenId(q.id);
    if (!q.is_read) run(() => setInquiryRead(q.id, true));
  };

  if (inquiries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink/15 py-16 text-center text-sm text-ink/40">
        접수된 견적 문의가 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
      <ul className="divide-y divide-ink/5">
        {inquiries.map((q) => {
          const open = openId === q.id;
          const location = [q.address, q.address_detail].filter(Boolean).join(" ");
          const period =
            q.event_start || q.event_end
              ? `${q.event_start ?? "?"} ~ ${q.event_end ?? "?"}`
              : q.event_date || "";
          return (
            <li key={q.id}>
              {/* 요약 행 */}
              <button
                type="button"
                onClick={() => onOpen(q)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-ink/[0.02]"
              >
                {!q.is_read && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" title="안읽음" />
                )}
                <span className="w-36 shrink-0 text-xs text-ink/50">
                  {fmtDate(q.created_at)}
                </span>
                <span className={`flex-1 truncate text-sm ${q.is_read ? "text-ink/70" : "font-semibold text-ink"}`}>
                  {q.company_name || q.name || "(업체명 없음)"}
                  {q.contact_name ? ` · ${q.contact_name}` : ""}
                </span>
                <span className="hidden w-32 shrink-0 text-xs text-ink/50 sm:block">
                  {q.phone}
                </span>
                <span className="shrink-0 text-ink/30">{open ? "▲" : "▼"}</span>
              </button>

              {/* 상세 */}
              {open && (
                <div className="border-t border-ink/5 bg-ink/[0.015] px-4 py-4">
                  <dl>
                    <Row label="업체명" value={q.company_name} />
                    <Row label="담당자명" value={q.contact_name || q.name} />
                    <Row label="연락처" value={q.phone} />
                    <Row label="이메일" value={q.email} />
                    <Row label="문의 제품" value={q.product} />
                    <Row label="제품 용도" value={q.usage} />
                    <Row label="행사 기간" value={period} />
                    <Row label="장소" value={location} />
                    <Row label="기타 문의" value={q.message} />
                  </dl>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => run(() => setInquiryRead(q.id, !q.is_read))}
                      disabled={pending}
                      className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 hover:bg-ink/5"
                    >
                      {q.is_read ? "안읽음으로" : "읽음으로"}
                    </button>
                    {q.email && (
                      <a
                        href={`mailto:${q.email}`}
                        className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 hover:bg-ink/5"
                      >
                        이메일 회신
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("이 문의를 삭제할까요?")) run(() => deleteInquiry(q.id));
                      }}
                      disabled={pending}
                      className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
