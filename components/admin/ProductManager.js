"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createProduct,
  toggleProduct,
  deleteProduct,
  swapProductOrder,
} from "@/app/admin/(panel)/products/actions";

export default function ProductManager({ products, categories }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [previews, setPreviews] = useState([]);
  const [form, setForm] = useState({
    name: "",
    category_id: "",
    description: "",
    specs: "",
    video_url: "",
  });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const run = (fn) =>
    startTransition(async () => {
      setError("");
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });

  const onPick = (e) => {
    const files = Array.from(e.target.files ?? []);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const onAdd = (e) => {
    e.preventDefault();
    const files = fileRef.current?.files;
    if (!form.name.trim()) return setError("제품명을 입력하세요.");
    if (!files || files.length === 0) return setError("사진을 1장 이상 선택하세요.");
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("category_id", form.category_id);
    fd.append("description", form.description);
    fd.append("specs", form.specs);
    fd.append("video_url", form.video_url);
    for (const f of files) fd.append("images", f);
    run(async () => {
      const res = await createProduct(fd);
      if (!res?.error) {
        setForm({ name: "", category_id: "", description: "", specs: "", video_url: "" });
        setPreviews([]);
        if (fileRef.current) fileRef.current.value = "";
      }
      return res;
    });
  };

  const inputCls =
    "w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div>
      {/* 추가 폼 */}
      <form onSubmit={onAdd} className="rounded-xl border border-ink/10 bg-white p-5">
        <p className="text-sm font-bold text-ink">새 제품 추가</p>

        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink/60">제품명</label>
              <input value={form.name} onChange={set("name")} className={inputCls} placeholder="예: 가챠머신" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink/60">카테고리</label>
              <select value={form.category_id} onChange={set("category_id")} className={inputCls}>
                <option value="">선택 안 함</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">설명</label>
            <textarea
              value={form.description}
              onChange={set("description")}
              className={`${inputCls} min-h-[70px] resize-y`}
              placeholder="제품 설명"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">스펙 (선택)</label>
            <textarea
              value={form.specs}
              onChange={set("specs")}
              className={`${inputCls} min-h-[70px] resize-y`}
              placeholder={"예: 기기 사이즈 W500 × D500 × H1600 mm\n운영 전력 220V / 약 200W"}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">
              유튜브 영상 URL (선택)
            </label>
            <input
              value={form.video_url}
              onChange={set("video_url")}
              className={inputCls}
              placeholder="예: https://youtube.com/shorts/XXXX (있으면 카드에서 영상 재생)"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">
              제품 사진 (여러 장 가능, 첫 장이 대표)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onPick}
              className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-black"
            />
            {previews.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {previews.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="h-20 w-20 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-medium text-primary">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-md bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
        >
          {pending ? "업로드 중..." : "제품 추가"}
        </button>
      </form>

      {/* 목록 */}
      <div className="mt-6 space-y-3">
        {products.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink/15 py-12 text-center text-sm text-ink/40">
            등록된 제품이 없습니다.
          </p>
        ) : (
          products.map((p, i) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border border-ink/10 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumbnail || ""}
                alt={p.name}
                className="h-16 w-16 shrink-0 rounded-lg bg-ink/5 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                <p className="truncate text-xs text-ink/50">{p.categoryName || "카테고리 없음"}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    p.is_active ? "bg-green-100 text-green-700" : "bg-ink/10 text-ink/50"
                  }`}
                >
                  {p.is_active ? "노출 중" : "숨김"}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <button
                  disabled={pending || i === 0}
                  onClick={() => run(() => swapProductOrder(p, products[i - 1]))}
                  className="px-1.5 text-ink/40 hover:text-ink disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  disabled={pending || i === products.length - 1}
                  onClick={() => run(() => swapProductOrder(p, products[i + 1]))}
                  className="px-1.5 text-ink/40 hover:text-ink disabled:opacity-30"
                >
                  ↓
                </button>
              </div>

              <button
                onClick={() => run(() => toggleProduct(p.id, !p.is_active))}
                disabled={pending}
                className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 hover:bg-ink/5"
              >
                {p.is_active ? "숨기기" : "노출"}
              </button>
              <button
                onClick={() => {
                  if (confirm(`'${p.name}' 제품을 삭제할까요?`)) run(() => deleteProduct(p.id));
                }}
                disabled={pending}
                className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
              >
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
