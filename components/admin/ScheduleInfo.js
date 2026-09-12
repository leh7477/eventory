"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateScheduleInfo } from "@/app/admin/(panel)/schedule/actions";

// 일정 현장 정보 패널 — 장소/담당자/연락처/발주처/비고
export default function ScheduleInfo({ schedule }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    location: schedule.location || "",
    client_manager: schedule.client_manager || "",
    client_phone: schedule.client_phone || "",
    vendor: schedule.vendor || "",
    note: schedule.note || "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = () =>
    startTransition(async () => {
      setMsg("");
      const res = await updateScheduleInfo(schedule.id, form);
      if (res?.error) setMsg(res.error);
      else {
        setMsg("저장됨");
        router.refresh();
        setTimeout(() => setMsg(""), 1500);
      }
    });

  const inputCls =
    "w-full rounded-md border border-ink/15 px-2.5 py-1.5 text-sm outline-none focus:border-primary";

  return (
    <div className="space-y-2.5 border-t border-ink/5 bg-emerald-50/40 px-4 py-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-ink/55">장소 / 주소</label>
          <input value={form.location} onChange={set("location")} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/55">업체 담당자</label>
          <input value={form.client_manager} onChange={set("client_manager")} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/55">담당자 연락처</label>
          <input value={form.client_phone} onChange={set("client_phone")} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-ink/55">비고 / 특이사항</label>
          <textarea
            value={form.note}
            onChange={set("note")}
            rows={3}
            className={`${inputCls} resize-y`}
            placeholder="예: 6cm 흰색 캡슐 250개 택배 발송 완 / 오전 10시 출고"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-white hover:bg-black disabled:opacity-60"
        >
          {pending ? "저장 중..." : "정보 저장"}
        </button>
        {msg && (
          <span className={`text-xs font-medium ${msg === "저장됨" ? "text-green-600" : "text-primary"}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
