"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  swapCategoryOrder,
} from "@/app/admin/(panel)/categories/actions";

export default function CategoriesManager({ categories }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
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
      const res = await createCategory(name);
      if (!res?.error) setName("");
      return res;
    });
  };

  const onSaveEdit = (id) => {
    run(async () => {
      const res = await updateCategory(id, editName);
      if (!res?.error) setEditId(null);
      return res;
    });
  };

  return (
    <div>
      {/* 추가 폼 */}
      <form onSubmit={onAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 카테고리 이름"
          className="flex-1 rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
        >
          추가
        </button>
      </form>

      {error && <p className="mt-3 text-sm font-medium text-primary">{error}</p>}

      {/* 목록 */}
      <div className="mt-6 overflow-hidden rounded-xl border border-ink/10 bg-white">
        {categories.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink/40">
            등록된 카테고리가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {categories.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-center text-xs text-ink/40">{i + 1}</span>

                {editId === c.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-md border border-ink/15 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium text-ink">{c.name}</span>
                )}

                {/* 순서 이동 */}
                <button
                  type="button"
                  disabled={pending || i === 0}
                  onClick={() => run(() => swapCategoryOrder(c, categories[i - 1]))}
                  className="rounded px-1.5 text-ink/40 hover:text-ink disabled:opacity-30"
                  aria-label="위로"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={pending || i === categories.length - 1}
                  onClick={() => run(() => swapCategoryOrder(c, categories[i + 1]))}
                  className="rounded px-1.5 text-ink/40 hover:text-ink disabled:opacity-30"
                  aria-label="아래로"
                >
                  ↓
                </button>

                {editId === c.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onSaveEdit(c.id)}
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
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditId(c.id);
                        setEditName(c.name);
                      }}
                      className="rounded-md border border-ink/15 px-3 py-1.5 text-xs text-ink/70 hover:bg-ink/5"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`'${c.name}' 카테고리를 삭제할까요?`))
                          run(() => deleteCategory(c.id));
                      }}
                      className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                    >
                      삭제
                    </button>
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
