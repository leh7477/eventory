"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHeroText } from "@/app/admin/(panel)/banner/actions";

const DEFAULTS = {
  wordmark: "EVENT LAND",
  subtitle: "Every Event Has a Story",
  sublist: "가챠머신 · 에어볼추첨기 · 스톱워치 · 룰렛 · 사격게임 · 핀볼게임",
};

// 타이포 히어로 문구 편집 (워드마크·서브문구·장비 줄)
export default function HeroTextEditor({ settings }) {
  const router = useRouter();
  const [wordmark, setWordmark] = useState(
    settings?.hero_wordmark ?? DEFAULTS.wordmark
  );
  const [subtitle, setSubtitle] = useState(
    settings?.hero_subtitle ?? DEFAULTS.subtitle
  );
  const [sublist, setSublist] = useState(
    settings?.hero_sublist ?? DEFAULTS.sublist
  );
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const save = () =>
    startTransition(async () => {
      setMsg("");
      setError("");
      const res = await updateHeroText({ wordmark, subtitle, sublist });
      if (res?.error) setError(res.error);
      else {
        setMsg("저장됨");
        router.refresh();
        setTimeout(() => setMsg(""), 1500);
      }
    });

  const inputCls =
    "w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-ink">히어로 문구</span>
        <span className="text-xs text-ink/40">
          (타이포 디자인일 때 화면에 나오는 글자)
        </span>
        {msg && (
          <span className="text-xs font-medium text-green-600">{msg}</span>
        )}
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            워드마크 (큰 글자)
          </label>
          <input
            className={`${inputCls} font-logo font-extrabold`}
            value={wordmark}
            onChange={(e) => setWordmark(e.target.value)}
            placeholder="EVENT LAND"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            서브 문구
          </label>
          <input
            className={inputCls}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Every Event Has a Story"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            장비 줄 (가운뎃점 · 으로 구분)
          </label>
          <input
            className={inputCls}
            value={sublist}
            onChange={(e) => setSublist(e.target.value)}
            placeholder="가챠머신 · 룰렛 · …"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs font-medium text-primary">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="mt-4 rounded-md bg-ink px-5 py-2 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
      >
        {pending ? "저장 중…" : "문구 저장"}
      </button>
    </div>
  );
}
