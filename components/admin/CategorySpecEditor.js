"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCategorySpecs } from "@/app/admin/(panel)/categories/actions";
import { getMachineSpecs, parseSpecsText } from "@/lib/samples";

const EMPTY = { label: "", value: "" };

export default function CategorySpecEditor({ category }) {
  const router = useRouter();
  const initial =
    parseSpecsText(category.default_specs) ||
    getMachineSpecs(category.name).map((s) => ({ ...s }));
  const [rows, setRows] = useState(initial.length ? initial : [{ ...EMPTY }]);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  const setRow = (i, k, v) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const add = () => setRows((rs) => [...rs, { ...EMPTY }]);
  const remove = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const save = () =>
    start(async () => {
      setMsg("");
      const text = rows
        .filter((r) => r.label.trim() || r.value.trim())
        .map((r) => `${r.label.trim()}: ${r.value.trim()}`)
        .join("\n");
      const res = await updateCategorySpecs(category.id, text);
      if (res?.error) setMsg(res.error);
      else {
        setMsg("저장됨");
        router.refresh();
        setTimeout(() => setMsg(""), 1500);
      }
    });

  return (
    <div className="border-t border-ink/5 bg-ink/[0.015] px-4 py-4">
      <p className="mb-2 text-xs font-medium text-ink/50">
        기본 장비 정보 (이 카테고리의 Stories 등록 시 기본값으로 채워집니다)
      </p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={r.label}
              onChange={(e) => setRow(i, "label", e.target.value)}
              placeholder="항목 (예: 기기 사이즈)"
              className="w-36 shrink-0 rounded-md border border-ink/15 px-2.5 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              value={r.value}
              onChange={(e) => setRow(i, "value", e.target.value)}
              placeholder="내용"
              className="flex-1 rounded-md border border-ink/15 px-2.5 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="shrink-0 rounded-md border border-ink/15 px-2 py-2 text-xs text-ink/40 hover:bg-ink/5"
              aria-label="행 삭제"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={add}
          className="rounded-md border border-dashed border-ink/20 px-3 py-1.5 text-xs font-medium text-ink/60 hover:bg-ink/5"
        >
          + 항목 추가
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-white hover:bg-black disabled:opacity-60"
        >
          기본 스펙 저장
        </button>
        {msg && <span className="text-xs font-medium text-green-600">{msg}</span>}
      </div>
    </div>
  );
}
