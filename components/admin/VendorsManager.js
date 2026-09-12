"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createVendor,
  updateVendor,
  deleteVendor,
} from "@/app/admin/(panel)/vendors/actions";

// 'YYYY-MM' 에 delta월 더하기
function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function thisMonthKST() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }).slice(0, 7);
  } catch {
    return new Date().toISOString().slice(0, 7);
  }
}

export default function VendorsManager({ vendors, ordersByVendor = {} }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState(null);
  const [viewMonth, setViewMonth] = useState(thisMonthKST());
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const run = (fn) =>
    startTransition(async () => {
      setError("");
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });

  const onAdd = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    run(async () => {
      const res = await createVendor({ name, contact, phone, memo });
      if (!res?.error) {
        setName("");
        setContact("");
        setPhone("");
        setMemo("");
      }
      return res;
    });
  };

  const startEdit = (v) => {
    setEditId(v.id);
    setEditName(v.name);
    setEditContact(v.contact || "");
    setEditPhone(v.phone || "");
    setEditMemo(v.memo || "");
  };

  const inputCls =
    "rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div>
      {/* 추가 폼 */}
      <form onSubmit={onAdd} className="rounded-xl border border-ink/10 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-ink">거래처 등록</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="거래처 이름 (예: 디자인에스디)"
            className={inputCls}
          />
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="담당자 성함 (선택)"
            className={inputCls}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="연락처 (선택)"
            className={inputCls}
          />
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 (비고 등, 선택)"
            className={`${inputCls} sm:col-span-2`}
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
          >
            추가
          </button>
        </div>
      </form>

      {error && <p className="mt-3 text-sm font-medium text-primary">{error}</p>}

      {/* 목록 */}
      <div className="mt-6 overflow-hidden rounded-xl border border-ink/10 bg-white">
        {vendors.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink/40">
            등록된 거래처가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {vendors.map((v) => (
              <li key={v.id} className="px-4 py-3">
                {editId === v.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="거래처 이름"
                        className={inputCls}
                        autoFocus
                      />
                      <input
                        value={editContact}
                        onChange={(e) => setEditContact(e.target.value)}
                        placeholder="담당자 성함"
                        className={inputCls}
                      />
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="연락처"
                        className={inputCls}
                      />
                      <input
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        placeholder="메모"
                        className={`${inputCls} sm:col-span-3`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            const res = await updateVendor(v.id, {
                              name: editName,
                              contact: editContact,
                              phone: editPhone,
                              memo: editMemo,
                            });
                            if (!res?.error) setEditId(null);
                            return res;
                          })
                        }
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="rounded-md border border-ink/15 px-3 py-1.5 text-xs text-ink/60"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{v.name}</p>
                      {(v.contact || v.phone) && (
                        <p className="text-xs text-ink/55">
                          {v.contact}
                          {v.contact && v.phone ? " · " : ""}
                          {v.phone}
                        </p>
                      )}
                      {v.memo && <p className="truncate text-xs text-ink/40">{v.memo}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (expandedId === v.id) {
                          setExpandedId(null);
                          return;
                        }
                        const months = (ordersByVendor[v.name] || [])
                          .map((o) => o.month)
                          .sort();
                        setViewMonth(months.length ? months[months.length - 1] : thisMonthKST());
                        setExpandedId(v.id);
                      }}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                        expandedId === v.id
                          ? "border-ink bg-ink text-white"
                          : "border-ink/15 text-ink/70 hover:bg-ink/5"
                      }`}
                    >
                      발주 내역
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(v)}
                      className="rounded-md border border-ink/15 px-3 py-1.5 text-xs text-ink/70 hover:bg-ink/5"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`'${v.name}' 거래처를 삭제할까요?`))
                          run(() => deleteVendor(v.id));
                      }}
                      className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                    >
                      삭제
                    </button>
                  </div>

                  {expandedId === v.id &&
                    (() => {
                      const orders = (ordersByVendor[v.name] || [])
                        .filter((o) => o.month === viewMonth)
                        .sort((a, b) => (a.date < b.date ? -1 : 1));
                      const total = orders.reduce((s, o) => s + o.count, 0);
                      return (
                        <div className="mt-2.5 rounded-lg bg-ink/[0.03] p-3">
                          {/* 월 네비게이션 */}
                          <div className="mb-2 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setViewMonth((m) => shiftMonth(m, -1))}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-ink/60 hover:bg-ink/10"
                              aria-label="이전 달"
                            >
                              ‹
                            </button>
                            <span className="text-sm font-bold text-ink">
                              {viewMonth.replace("-", ". ")} 발주
                            </span>
                            <button
                              type="button"
                              onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-ink/60 hover:bg-ink/10"
                              aria-label="다음 달"
                            >
                              ›
                            </button>
                          </div>

                          {orders.length === 0 ? (
                            <p className="py-2 text-center text-xs text-ink/40">
                              이 달 발주가 없습니다.
                            </p>
                          ) : (
                            <ul className="space-y-1">
                              {orders.map((o, i) => (
                                <li
                                  key={i}
                                  className="flex items-center justify-between gap-2 text-xs"
                                >
                                  <span className="min-w-0 flex-1 truncate text-ink/70">
                                    {o.title}
                                    <span className="ml-1.5 text-ink/35">
                                      {(o.date || "").slice(5).replace("-", "/")}
                                    </span>
                                  </span>
                                  <span className="shrink-0 font-bold text-ink">
                                    {o.count}개
                                  </span>
                                </li>
                              ))}
                              <li className="mt-1 flex items-center justify-between border-t border-ink/10 pt-1.5 text-xs">
                                <span className="font-bold text-ink/70">합계</span>
                                <span className="font-extrabold text-primary">{total}개</span>
                              </li>
                            </ul>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
