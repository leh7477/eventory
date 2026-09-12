"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createEquipment,
  updateEquipment,
  setEquipmentActive,
  deleteEquipment,
} from "@/app/admin/(panel)/inventory/actions";

export default function InventoryManager({ equipment, categories = [] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
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

  // 종류 입력 도우미 목록 (제품 카테고리 + 이미 등록된 기기 종류)
  const catOptions = useMemo(() => {
    const set = new Set(categories);
    equipment.forEach((e) => e.category && set.add(e.category));
    return [...set];
  }, [categories, equipment]);

  // 종류별 그룹핑
  const groups = useMemo(() => {
    const map = new Map();
    for (const e of equipment) {
      const key = e.category || "미분류";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return [...map.entries()];
  }, [equipment]);

  const total = equipment.length;
  const activeCount = equipment.filter((e) => e.active).length;

  const onAdd = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    run(async () => {
      const res = await createEquipment({ name, category });
      if (!res?.error) setName("");
      return res;
    });
  };

  const startEdit = (e) => {
    setEditId(e.id);
    setEditName(e.name);
    setEditCategory(e.category || "");
    setEditMemo(e.memo || "");
  };

  const onSaveEdit = (id) => {
    run(async () => {
      const res = await updateEquipment(id, {
        name: editName,
        category: editCategory,
        memo: editMemo,
      });
      if (!res?.error) setEditId(null);
      return res;
    });
  };

  return (
    <div>
      {/* 추가 폼 */}
      <form onSubmit={onAdd} className="rounded-xl border border-ink/10 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-ink">기기 등록</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="equip-cats"
            placeholder="종류 (예: 가챠머신)"
            className="rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary sm:w-44"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="기기 이름 (예: 가챠머신1)"
            className="flex-1 rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
          >
            추가
          </button>
        </div>
        <datalist id="equip-cats">
          {catOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </form>

      {error && <p className="mt-3 text-sm font-medium text-primary">{error}</p>}

      {/* 요약 */}
      <div className="mt-4 flex items-center gap-3 text-sm">
        <span className="text-ink/60">
          전체 <b className="text-ink">{total}</b>대
        </span>
        <span className="text-ink/30">·</span>
        <span className="text-ink/60">
          운영중 <b className="text-green-600">{activeCount}</b>대
        </span>
        {total - activeCount > 0 && (
          <>
            <span className="text-ink/30">·</span>
            <span className="text-ink/60">
              중지 <b className="text-ink/50">{total - activeCount}</b>대
            </span>
          </>
        )}
      </div>

      {/* 목록 (종류별) */}
      {total === 0 ? (
        <div className="mt-4 rounded-xl border border-ink/10 bg-white px-4 py-10 text-center text-sm text-ink/40">
          등록된 기기가 없습니다. 위에서 첫 기기를 추가해보세요.
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map(([cat, items]) => (
            <div
              key={cat}
              className="overflow-hidden rounded-xl border border-ink/10 bg-white"
            >
              <div className="flex items-center justify-between border-b border-ink/5 bg-ink/[0.02] px-4 py-2.5">
                <span className="text-sm font-bold text-ink">{cat}</span>
                <span className="text-xs text-ink/40">{items.length}대</span>
              </div>
              <ul className="divide-y divide-ink/5">
                {items.map((e) => (
                  <li key={e.id} className="px-4 py-3">
                    {editId === e.id ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={editCategory}
                            onChange={(ev) => setEditCategory(ev.target.value)}
                            list="equip-cats"
                            placeholder="종류"
                            className="rounded-md border border-ink/15 px-2.5 py-1.5 text-sm outline-none focus:border-primary sm:w-40"
                          />
                          <input
                            value={editName}
                            onChange={(ev) => setEditName(ev.target.value)}
                            placeholder="기기 이름"
                            className="flex-1 rounded-md border border-ink/15 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                            autoFocus
                          />
                        </div>
                        <input
                          value={editMemo}
                          onChange={(ev) => setEditMemo(ev.target.value)}
                          placeholder="메모 (선택)"
                          className="rounded-md border border-ink/15 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onSaveEdit(e.id)}
                            disabled={pending}
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
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            e.active ? "bg-green-500" : "bg-ink/20"
                          }`}
                          title={e.active ? "운영중" : "중지"}
                        />
                        <div className="min-w-0 flex-1">
                          <span
                            className={`text-sm font-medium ${
                              e.active ? "text-ink" : "text-ink/40 line-through"
                            }`}
                          >
                            {e.name}
                          </span>
                          {e.memo && (
                            <span className="ml-2 text-xs text-ink/40">{e.memo}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => run(() => setEquipmentActive(e.id, !e.active))}
                          disabled={pending}
                          className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                            e.active
                              ? "border-ink/15 text-ink/60 hover:bg-ink/5"
                              : "border-green-300 text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {e.active ? "운영중지" : "운영재개"}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(e)}
                          className="rounded-md border border-ink/15 px-2.5 py-1.5 text-xs text-ink/70 hover:bg-ink/5"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`'${e.name}' 기기를 삭제할까요?`))
                              run(() => deleteEquipment(e.id));
                          }}
                          className="rounded-md border border-primary/30 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
