"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setInquiryRead,
  setInquiryHandled,
  deleteInquiry,
} from "@/app/admin/(panel)/inquiries/actions";

// 행사 기간 일수 (시작~종료 포함). 예: 07-23~07-26 → 4일
function daysBetween(start, end) {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e)) return null;
  const d = Math.round((e - s) / 86400000) + 1;
  return d > 0 ? d : null;
}

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
      {/* 컬럼 헤더 */}
      <div className="flex items-center gap-4 border-b border-ink/10 bg-ink/[0.02] px-4 py-2.5 text-xs font-semibold text-ink/40">
        <span className="w-16 shrink-0">상태</span>
        <span className="w-32 shrink-0">접수일</span>
        <span className="flex-1">업체 · 담당자</span>
        <span className="hidden w-32 shrink-0 sm:block">연락처</span>
        <span className="w-4 shrink-0" />
      </div>

      <ul className="divide-y divide-ink/5">
        {inquiries.map((q) => {
          const open = openId === q.id;
          const location = [q.address, q.address_detail].filter(Boolean).join(" ");
          const days = daysBetween(q.event_start, q.event_end);
          const period =
            q.event_start || q.event_end
              ? `${q.event_start ?? "?"} ~ ${q.event_end ?? "?"}${
                  days ? ` (${days}일)` : ""
                }`
              : q.event_date || "";
          return (
            <li key={q.id}>
              {/* 요약 행 */}
              <button
                type="button"
                onClick={() => onOpen(q)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-ink/[0.02]"
              >
                {/* 1. 상태 */}
                <span className="w-16 shrink-0">
                  {q.handled ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                      완료
                    </span>
                  ) : (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      미처리
                    </span>
                  )}
                </span>
                {/* 2. 날짜 */}
                <span className="w-32 shrink-0 text-xs text-ink/50">
                  {fmtDate(q.created_at)}
                </span>
                {/* 3. 업체 · 담당자 */}
                <span className={`flex-1 truncate text-sm ${q.is_read ? "text-ink/70" : "font-semibold text-ink"}`}>
                  {!q.is_read && (
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" title="안읽음" />
                  )}
                  {q.company_name || q.name || "(업체명 없음)"}
                  {q.contact_name ? ` · ${q.contact_name}` : ""}
                </span>
                {/* 4. 연락처 */}
                <span className="hidden w-32 shrink-0 text-xs text-ink/50 sm:block">
                  {q.phone}
                </span>
                {/* 5. 펼침 */}
                <span className="w-4 shrink-0 text-center text-ink/30">
                  {open ? "▲" : "▼"}
                </span>
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

                  {q.handled && (
                    <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
                      ✓ 회신 완료 — {q.handled_by || "담당자"}
                      {q.handled_at ? ` · ${fmtDate(q.handled_at)}` : ""}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={`/admin/inquiries/${q.id}/quote`}
                      className="rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-black"
                    >
                      견적서 작성
                    </a>
                    <button
                      type="button"
                      onClick={() => run(() => setInquiryHandled(q.id, !q.handled))}
                      disabled={pending}
                      className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                        q.handled
                          ? "border border-ink/15 text-ink/60 hover:bg-ink/5"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {q.handled ? "회신완료 취소" : "회신 완료 처리"}
                    </button>
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
