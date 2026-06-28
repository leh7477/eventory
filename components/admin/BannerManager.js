"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createBanner,
  toggleBanner,
  deleteBanner,
  swapBannerOrder,
} from "@/app/admin/(panel)/banner/actions";

export default function BannerManager({ banners }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (fn) =>
    startTransition(async () => {
      setError("");
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });

  const onPick = (e) => {
    const f = e.target.files?.[0];
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const onAdd = (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("이미지를 선택하세요.");
      return;
    }
    const fd = new FormData();
    fd.append("image", file);
    fd.append("title", title);
    fd.append("subtitle", subtitle);
    run(async () => {
      const res = await createBanner(fd);
      if (!res?.error) {
        setTitle("");
        setSubtitle("");
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
      }
      return res;
    });
  };

  return (
    <div>
      {/* 추가 폼 */}
      <form onSubmit={onAdd} className="rounded-xl border border-ink/10 bg-white p-5">
        <p className="text-sm font-bold text-ink">새 배너 추가</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">이미지</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPick}
              className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-black"
            />
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="미리보기" className="mt-3 aspect-[16/9] w-full rounded-lg object-cover" />
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink/60">제목 (선택)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink/60">부제목 (선택)</label>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-primary">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-md bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
        >
          {pending ? "처리 중..." : "배너 추가"}
        </button>
      </form>

      {/* 목록 */}
      <div className="mt-6 space-y-3">
        {banners.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink/15 py-12 text-center text-sm text-ink/40">
            등록된 배너가 없습니다.
          </p>
        ) : (
          banners.map((b, i) => (
            <div
              key={b.id}
              className="flex items-center gap-4 rounded-xl border border-ink/10 bg-white p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.image_url}
                alt={b.title ?? "배너"}
                className="h-16 w-28 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {b.title || <span className="text-ink/40">(제목 없음)</span>}
                </p>
                <p className="truncate text-xs text-ink/50">{b.subtitle}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    b.is_active ? "bg-green-100 text-green-700" : "bg-ink/10 text-ink/50"
                  }`}
                >
                  {b.is_active ? "노출 중" : "숨김"}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <button
                  disabled={pending || i === 0}
                  onClick={() => run(() => swapBannerOrder(b, banners[i - 1]))}
                  className="px-1.5 text-ink/40 hover:text-ink disabled:opacity-30"
                  aria-label="위로"
                >
                  ↑
                </button>
                <button
                  disabled={pending || i === banners.length - 1}
                  onClick={() => run(() => swapBannerOrder(b, banners[i + 1]))}
                  className="px-1.5 text-ink/40 hover:text-ink disabled:opacity-30"
                  aria-label="아래로"
                >
                  ↓
                </button>
              </div>

              <button
                onClick={() => run(() => toggleBanner(b.id, !b.is_active))}
                disabled={pending}
                className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 hover:bg-ink/5"
              >
                {b.is_active ? "숨기기" : "노출"}
              </button>
              <button
                onClick={() => {
                  if (confirm("이 배너를 삭제할까요?")) run(() => deleteBanner(b.id));
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
