"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setInquiryRead,
  updateInquiryStatus,
  updateInquiry,
  setContractAmount,
  deleteInquiry,
} from "@/app/admin/(panel)/inquiries/actions";
import { createScheduleFromInquiry } from "@/app/admin/(panel)/schedule/actions";
import TimeSelect from "@/components/admin/TimeSelect";
import DatePicker from "@/components/DatePicker";

// 문의 진행 단계 (파이프라인)
const STATUS_META = {
  new: { label: "신규", badge: "bg-primary/10 text-primary" },
  quoted: { label: "견적발송", badge: "bg-indigo-100 text-indigo-700" },
  confirmed: { label: "계약확정", badge: "bg-green-100 text-green-700" },
  done: { label: "완료", badge: "bg-ink/10 text-ink/50" },
  cancelled: { label: "취소", badge: "bg-ink/[0.04] text-ink/40" },
};
// status 컬럼 없던 기존 데이터 폴백 (handled 기준)
const statusOf = (q) => q.status || (q.handled ? "done" : "new");
const statusMeta = (v) => STATUS_META[v] || STATUS_META.new;

const _today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
// 계약확정인데 행사 종료일이 지났으면 '완료'로 자동 표시
const effectiveStatus = (q) => {
  const s = statusOf(q);
  if (s === "confirmed" && q.event_end && q.event_end < _today()) return "done";
  return s;
};

// 진행 단계 (스텝바)
const STEPS = [
  { v: "new", label: "신규" },
  { v: "quoted", label: "견적발송" },
  { v: "confirmed", label: "계약확정" },
  { v: "done", label: "완료" },
];

// 단계 카드
function StepBox({ n, title, active, done, right, children }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        active ? "border-primary/40 bg-primary/[0.03]" : "border-ink/10 bg-white"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
            done
              ? "bg-green-500 text-white"
              : active
              ? "bg-primary text-white"
              : "bg-ink/10 text-ink/50"
          }`}
        >
          {done ? "✓" : n}
        </span>
        <span className="text-xs font-bold text-ink/70">{title}</span>
        {active && (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            지금 할 차례
          </span>
        )}
        {right && <span className="ml-auto">{right}</span>}
      </div>
      {children}
    </div>
  );
}

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

  // 계약 금액 입력 (숫자 문자열, id별)
  const [amounts, setAmounts] = useState({});
  const amtValue = (q) =>
    amounts[q.id] !== undefined
      ? amounts[q.id]
      : q.contract_amount != null
      ? String(q.contract_amount)
      : "";
  const setAmt = (id, raw) =>
    setAmounts((a) => ({ ...a, [id]: raw.replace(/\D/g, "") }));

  // 일정 등록 팝업 (설치/회수 일시 — 전날 설치 등 날짜 변경 가능)
  const [scheduleFor, setScheduleFor] = useState(null); // 대상 문의 객체
  const [schStartDate, setSchStartDate] = useState("");
  const [schEndDate, setSchEndDate] = useState("");
  const [schStart, setSchStart] = useState("");
  const [schEnd, setSchEnd] = useState("");

  const openSchedule = (q) => {
    const st = statusOf(q);
    if (st !== "confirmed" && st !== "done") {
      alert("'계약확정' 상태의 문의만 일정 등록할 수 있어요. 상세에서 상태를 '계약확정'으로 바꿔주세요.");
      return;
    }
    setSchStartDate(q.event_start ?? "");
    setSchEndDate(q.event_end ?? q.event_start ?? "");
    setSchStart("");
    setSchEnd("");
    setScheduleFor(q);
  };

  const submitSchedule = () =>
    run(async () => {
      const res = await createScheduleFromInquiry(scheduleFor.id, {
        start_date: schStartDate,
        end_date: schEndDate,
        start_time: schStart,
        end_time: schEnd,
      });
      if (res?.error) alert(res.error);
      else {
        setScheduleFor(null);
        alert("일정에 등록되었습니다. (행사 일정 메뉴에서 확인)");
      }
    });

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
        <span className="w-16 shrink-0 sm:w-20">상태</span>
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
          const st = statusOf(q);
          const eff = effectiveStatus(q);
          const curIdx =
            st === "cancelled"
              ? -1
              : STEPS.findIndex((s) => s.v === (eff === "done" ? "done" : st));
          return (
            <li key={q.id}>
              {/* 요약 행 */}
              <button
                type="button"
                onClick={() => onOpen(q)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-ink/[0.02] sm:gap-4"
              >
                {/* 1. 상태 */}
                <span className="w-16 shrink-0 sm:w-20">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${statusMeta(effectiveStatus(q)).badge}`}
                  >
                    {statusMeta(effectiveStatus(q)).label}
                  </span>
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
                        <DatePicker
                          value={editForm.event_start}
                          onChange={(v) => setEditForm((f) => ({ ...f, event_start: v }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-ink/50">행사 종료일</label>
                        <DatePicker
                          value={editForm.event_end}
                          min={editForm.event_start || undefined}
                          onChange={(v) => setEditForm((f) => ({ ...f, event_end: v }))}
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
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-bold text-ink/70">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink/10 text-[11px]">
                          1
                        </span>
                        문의 내용
                      </span>
                      <button
                        type="button"
                        onClick={() => openEdit(q)}
                        className="rounded-md border border-ink/15 px-2.5 py-1 text-xs text-ink/60 hover:bg-ink/5"
                      >
                        수정
                      </button>
                    </div>
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
                    <Row
                      label="최근 견적"
                      value={
                        q.quoted_amount
                          ? `₩ ${Number(q.quoted_amount).toLocaleString("ko-KR")} (공급가액)`
                          : null
                      }
                    />
                  </dl>
                  </div>
                  )}

                  {editId !== q.id && (
                    <div className="mt-3 space-y-3">
                      {/* ⓪ 진행 상태 스텝바 */}
                      <div className="rounded-lg border border-ink/10 bg-white p-3">
                        <div className="mb-2.5 flex items-center justify-between">
                          <p className="text-xs font-bold text-ink/60">진행 상태</p>
                          {st === "cancelled" && (
                            <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold text-ink/50">
                              취소됨
                            </span>
                          )}
                        </div>
                        <div className="flex items-center">
                          {STEPS.map((s, i) => {
                            const filled = st !== "cancelled" && i <= curIdx;
                            const isCur = i === curIdx;
                            const clickable = s.v !== "done";
                            return (
                              <div
                                key={s.v}
                                className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}
                              >
                                <button
                                  type="button"
                                  disabled={!clickable || pending}
                                  onClick={() =>
                                    clickable &&
                                    run(async () => {
                                      const r = await updateInquiryStatus(q.id, s.v);
                                      if (r?.error) alert(r.error);
                                    })
                                  }
                                  className="flex flex-col items-center gap-1"
                                >
                                  <span
                                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                                      filled ? "bg-primary text-white" : "bg-ink/10 text-ink/40"
                                    } ${isCur ? "ring-2 ring-primary/30" : ""}`}
                                  >
                                    {i + 1}
                                  </span>
                                  <span
                                    className={`text-[10px] ${filled ? "font-bold text-ink" : "text-ink/40"}`}
                                  >
                                    {s.label}
                                  </span>
                                </button>
                                {i < STEPS.length - 1 && (
                                  <span
                                    className={`mx-1 mb-4 h-0.5 flex-1 ${i < curIdx ? "bg-primary" : "bg-ink/10"}`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ② 견적서 작성 */}
                      <StepBox
                        n="2"
                        title="견적서 작성"
                        active={st === "new"}
                        done={["quoted", "confirmed", "done"].includes(st) || eff === "done"}
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <a
                            href={`/admin/inquiries/${q.id}/quote`}
                            className="rounded-md bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-black"
                          >
                            견적서 작성 →
                          </a>
                          {q.quoted_amount ? (
                            <span className="text-xs text-ink/60">
                              최근 견적{" "}
                              <b>₩ {Number(q.quoted_amount).toLocaleString("ko-KR")}</b>{" "}
                              (공급가액)
                            </span>
                          ) : (
                            <span className="text-xs text-ink/40">아직 견적 기록이 없어요</span>
                          )}
                        </div>
                      </StepBox>

                      {/* ③ 계약 확정 */}
                      <StepBox
                        n="3"
                        title="계약 확정"
                        active={st === "quoted"}
                        done={st === "confirmed" || eff === "done"}
                      >
                        {st === "confirmed" || eff === "done" ? (
                          (() => {
                            const supply = Number(amtValue(q)) || 0;
                            const vat = Math.round(supply * 0.1);
                            const won = (n) => n.toLocaleString("ko-KR");
                            return (
                              <div>
                                <p className="mb-1.5 text-xs font-bold text-ink/60">
                                  계약 금액{" "}
                                  <span className="font-normal text-ink/40">
                                    (공급가액 · 매출 통계 반영)
                                  </span>
                                </p>
                                {q.quoted_amount ? (
                                  <button
                                    type="button"
                                    onClick={() => setAmt(q.id, String(q.quoted_amount))}
                                    className="mb-1.5 text-xs font-medium text-primary underline underline-offset-2"
                                  >
                                    최근 견적 ₩
                                    {Number(q.quoted_amount).toLocaleString("ko-KR")} 불러오기
                                  </button>
                                ) : null}
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <input
                                      inputMode="numeric"
                                      value={supply ? won(supply) : ""}
                                      onChange={(e) => setAmt(q.id, e.target.value)}
                                      placeholder="0"
                                      className="w-40 rounded-md border border-ink/15 py-2 pl-3 pr-7 text-right text-sm outline-none focus:border-primary"
                                    />
                                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink/40">
                                      원
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() =>
                                      run(async () => {
                                        const res = await setContractAmount(q.id, amtValue(q));
                                        if (res?.error) alert(res.error);
                                      })
                                    }
                                    className="rounded-md bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-60"
                                  >
                                    저장
                                  </button>
                                </div>
                                {supply > 0 && (
                                  <div className="mt-2 w-56 space-y-0.5 text-xs">
                                    <div className="flex justify-between text-ink/50">
                                      <span>공급가액</span>
                                      <span>₩ {won(supply)}</span>
                                    </div>
                                    <div className="flex justify-between text-ink/50">
                                      <span>부가세 (10%)</span>
                                      <span>₩ {won(vat)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-ink/10 pt-0.5 font-bold text-ink">
                                      <span>합계 (부가세 포함)</span>
                                      <span>₩ {won(supply + vat)}</span>
                                    </div>
                                  </div>
                                )}
                                {eff === "done" && (
                                  <p className="mt-2 text-[11px] text-ink/45">
                                    행사 종료일이 지나 <b>완료</b>로 자동 표시됩니다.
                                  </p>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              run(async () => {
                                const r = await updateInquiryStatus(q.id, "confirmed");
                                if (r?.error) alert(r.error);
                              })
                            }
                            className="rounded-md bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            계약확정으로 변경
                          </button>
                        )}
                      </StepBox>
                      {/* ④ 일정 등록 */}
                      <StepBox n="4" title="일정 등록" active={st === "confirmed"}>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={pending || !(st === "confirmed" || eff === "done")}
                            onClick={() => openSchedule(q)}
                            className="rounded-md bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-40"
                          >
                            일정 등록
                          </button>
                          {!(st === "confirmed" || eff === "done") && (
                            <span className="text-[11px] text-ink/40">
                              계약확정 후 등록할 수 있어요
                            </span>
                          )}
                        </div>
                      </StepBox>
                    </div>
                  )}

                  {/* 활동 로그 (상태 변경·일정 등록·수정 이력) */}
                  {Array.isArray(q.activity_log) && q.activity_log.length > 0 && (
                    <div className="mt-3 space-y-1">
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
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-ink/5 pt-3">
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
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            const r = await updateInquiryStatus(
                              q.id,
                              st === "cancelled" ? "new" : "cancelled"
                            );
                            if (r?.error) alert(r.error);
                          })
                        }
                        className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                      >
                        {st === "cancelled" ? "취소 해제" : "문의 취소"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("이 문의를 완전히 삭제할까요? (복구 불가)"))
                            run(() => deleteInquiry(q.id));
                        }}
                        disabled={pending}
                        className="ml-auto rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
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

      {/* 일정 등록 팝업 (시간 선택 입력) */}
      {scheduleFor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            onClick={() => setScheduleFor(null)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-base font-bold text-ink">일정 등록</p>
            <p className="mt-1 truncate text-sm text-ink/60">
              {scheduleFor.company_name || scheduleFor.name}
              {scheduleFor.product ? ` · ${scheduleFor.product}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-ink/40">
              {scheduleFor.event_start}
              {scheduleFor.event_end && scheduleFor.event_end !== scheduleFor.event_start
                ? ` ~ ${scheduleFor.event_end}`
                : ""}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-blue-700">설치 일시</label>
                <div className="space-y-1.5">
                  <DatePicker value={schStartDate} onChange={setSchStartDate} />
                  <TimeSelect value={schStart} onChange={setSchStart} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-amber-700">회수 일시</label>
                <div className="space-y-1.5">
                  <DatePicker
                    value={schEndDate}
                    min={schStartDate || undefined}
                    onChange={setSchEndDate}
                  />
                  <TimeSelect value={schEnd} onChange={setSchEnd} />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ink/40">
              전날 설치라면 설치 날짜를 바꿔주세요. 시간은 비워도 되고 나중에
              행사 일정에서 수정할 수 있어요.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={submitSchedule}
                className="flex-1 rounded-md bg-ink py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
              >
                {pending ? "등록 중..." : "일정 등록"}
              </button>
              <button
                type="button"
                onClick={() => setScheduleFor(null)}
                className="rounded-md border border-ink/15 px-4 py-2.5 text-sm text-ink/60 hover:bg-ink/5"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
