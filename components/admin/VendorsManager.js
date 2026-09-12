"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createVendor,
  updateVendor,
  deleteVendor,
} from "@/app/admin/(panel)/vendors/actions";

export default function VendorsManager({ vendors }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
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
      const res = await createVendor({ name, memo });
      if (!res?.error) {
        setName("");
        setMemo("");
      }
      return res;
    });
  };

  const startEdit = (v) => {
    setEditId(v.id);
    setEditName(v.name);
    setEditMemo(v.memo || "");
  };

  const inputCls =
    "rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div>
      {/* 추가 폼 */}
      <form onSubmit={onAdd} className="rounded-xl border border-ink/10 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-ink">거래처 등록</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="거래처 이름 (예: 디자인에스디)"
            className={`${inputCls} sm:w-52`}
          />
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 (연락처·비고 등, 선택)"
            className={`${inputCls} flex-1`}
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
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`${inputCls} sm:w-52`}
                        autoFocus
                      />
                      <input
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        placeholder="메모"
                        className={`${inputCls} flex-1`}
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
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{v.name}</p>
                      {v.memo && <p className="truncate text-xs text-ink/45">{v.memo}</p>}
                    </div>
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
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
