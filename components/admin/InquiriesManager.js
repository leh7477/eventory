"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setInquiryRead,
  setInquiryHandled,
  updateInquiry,
  deleteInquiry,
} from "@/app/admin/(panel)/inquiries/actions";
import { createScheduleFromInquiry } from "@/app/admin/(panel)/schedule/actions";

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

  // 문의 내용 수정 모드
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const openEdit = (q) => {
    setEditId(q.id);
    setEditForm({
      company_name: q.company_name ?? "",
      contact_name: q.contact_name ?? "",
      phone: q.phone ?? "",
      email: q.email ?? "",
      product: q.product ?? "",
      usage: q.usage ?? "",
      event_start: q.event_start ?? "",
      event_end: q.event_end ?? "",
      address: q.address ?? "",
      address_detail: q.address_detail ?? "",
      message: q.message ?? "",
    });
  };
  const setF = (k) => (e) => setEditForm((f) => ({ ...f, [k]: e.target.value }));

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
      <div className="flex items-center gap-3 border-b border-ink/10 bg-ink/[0.02] px-4 py-2.5 text-xs font-semibold text-ink/40 sm:gap-4">
        <span className="w-14 shrink-0 sm:w-16">상태</span>
        <span className="hidden w-32 shrink-0 sm:block">접수일</span>
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
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-ink/[0.02] sm:gap-4"
              >
                {/* 1. 상태 */}
                <span className="w-14 shrink-0 sm:w-16">
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
                {/* 2. 날짜 (데스크탑) */}
                <span className="hidden w-32 shrink-0 text-xs text-ink/50 sm:block">
                  {fmtDate(q.created_at)}
                </span>
                {/* 3. 업체 · 담당자 (모바일에선 날짜를 아래 줄로) */}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${q.is_read ? "text-ink/70" : "font-semibold text-ink"}`}>
                    {!q.is_read && (
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" title="안읽음" />
                    )}
                    {q.company_name || q.name || "(업체명 없음)"}
                    {q.contact_name ? ` · ${q.contact_name}` : ""}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink/40 sm:hidden">
                    {fmtDate(q.created_at)}
                  </span>
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
                  {editId === q.id ? (
                    /* 수정 모드 */
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ["업체명", "company_name", "text"],
                        ["담당자명", "contact_name", "text"],
                        ["연락처", "phone", "text"],
                        ["이메일", "email", "email"],
                        ["문의 제품", "product", "text"],
                      ].map(([label, key, type]) => (
                        <div key={key}>
                          <label className="mb-1 block text-xs text-ink/50">{label}</label>
                          <input
                            type={type}
                            value={editForm[key]}
                            onChange={setF(key)}
                            className="w-full rounded-md border border-ink/15 px-2.5 py-2 text-sm outline-none focus:border-primary"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="mb-1 block text-xs text-ink/50">제품 용도</label>
                        <select
                          value={editForm.usage}
                          onChange={setF("usage")}
                          className="w-full rounded-md border border-ink/15 px-2.5 py-2 text-sm outline-none focus:border-primary"
                        >
                          <option value="">선택 안 함</option>
                          <option value="임대">임대</option>
                          <option value="제작">제작</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-ink/50">행사 시작일</label>
                        <input
                          type="date"
                          value={editForm.event_start}
                          onChange={setF("event_start")}
                          className="w-full rounded-md border border-ink/15 px-2.5 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-ink/50">행사 종료일</label>
                        <input
                          type="date"
                          value={editForm.event_end}
                          min={editForm.event_start || undefined}
                          onChange={setF("event_end")}
                          className="w-full rounded-md border border-ink/15 px-2.5 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-ink/50">주소</label>
                        <input
                          value={editForm.address}
                          onChange={setF("address")}
                          className="w-full rounded-md border border-ink/15 px-2.5 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-ink/50">상세주소</label>
                        <input
                          value={editForm.address_detail}
                          onChange={setF("address_detail")}
                          className="w-full rounded-md border border-ink/15 px-2.5 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-ink/50">기타 문의</label>
                        <textarea
                          value={editForm.message}
                          onChange={setF("message")}
                          className="min-h-[60px] w-full resize-y rounded-md border border-ink/15 px-2.5 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(async () => {
                              const res = await updateInquiry(q.id, editForm);
                              if (res?.error) alert(res.error);
                              else setEditId(null);
                            })
                          }
                          className="rounded-md bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-60"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="rounded-md border border-ink/15 px-4 py-2 text-xs text-ink/60 hover:bg-ink/5"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
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
                  )}

                  {q.handled && (
                    <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
                      ✓ 회신 완료 — {q.handled_by || "담당자"}
                      {q.handled_at ? ` · ${fmtDate(q.handled_at)}` : ""}
                    </p>
                  )}

                  {/* 활동 로그 (일정 등록·수정 이력) */}
                  {Array.isArray(q.activity_log) && q.activity_log.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {q.activity_log
                        .slice(-5)
                        .reverse()
                        .map((l, i) => (
                          <p
                            key={i}
                            className="rounded-md bg-ink/[0.04] px-3 py-1.5 text-xs text-ink/55"
                          >
                            {l.action} — {l.by || "관리자"}
                            {l.at ? ` · ${fmtDate(l.at)}` : ""}
                          </p>
                        ))}
                    </div>
                  )}

                  {editId !== q.id && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={`/admin/inquiries/${q.id}/quote`}
                      className="rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-black"
                    >
                      견적서 작성
                    </a>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const res = await createScheduleFromInquiry(q.id);
                          if (res?.error) alert(res.error);
                          else alert("일정에 등록되었습니다. (일정 메뉴에서 확인)");
                        })
                      }
                      className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-bold text-ink/70 hover:bg-ink/5"
                    >
                      일정 등록
                    </button>
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
                    <button
                      type="button"
                      onClick={() => openEdit(q)}
                      className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 hover:bg-ink/5"
                    >
                      수정
                    </button>
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
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
