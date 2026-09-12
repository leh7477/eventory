"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHeroMode } from "@/app/admin/(panel)/banner/actions";

const MODES = [
  { v: "type", label: "타이포", desc: "사진 없이 큰 글자로 채움" },
  { v: "slide", label: "슬라이드", desc: "대형 배너가 5초마다 한 장씩 넘어감(1장이면 정지)" },
  { v: "marquee", label: "흐르게", desc: "등록된 배너가 옆으로 계속 흐름" },
];

// 사진 자리 표시용 플레이스홀더 (산+해 아이콘 = "여기가 사진 영역")
function PhotoZone({ className = "" }) {
  return (
    <div
      className={`flex items-center justify-center bg-ink/10 text-ink/40 ${className}`}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="M21 16l-5-5L5 20" />
      </svg>
    </div>
  );
}

// 모드별 미니 미리보기 (실제 히어로가 어떻게 나오는지 도식으로)
// 회색 사진 아이콘 영역 = 사진이 들어가는 자리
function ModePreview({ mode, wordmark, subtitle }) {
  const frame =
    "relative mx-auto aspect-[16/7] w-full max-w-md overflow-hidden rounded-lg border border-ink/10";

  if (mode === "type") {
    return (
      <div className={`${frame} flex flex-col items-center justify-center bg-white px-4`}>
        {/* 실제 홈과 동일: Geist 폰트, 검정 글자 */}
        <span
          style={{ fontFamily: "var(--font-display), sans-serif" }}
          className="max-w-full truncate text-2xl font-bold tracking-tight text-ink sm:text-3xl"
        >
          {wordmark || "EVENT LAND"}
        </span>
        {subtitle && (
          <span className="mt-1.5 text-[11px] font-bold tracking-wide text-ink sm:text-xs">
            {subtitle}
          </span>
        )}
      </div>
    );
  }

  if (mode === "slide") {
    return (
      <div className={frame}>
        {/* 사진 한 장이 전체(선명) */}
        <PhotoZone className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/45 to-transparent" />
        <div className="absolute bottom-4 left-4 h-2.5 w-24 rounded bg-white/90" />
        {/* 슬라이드 도트 */}
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
          <span className="h-1.5 w-4 rounded-full bg-white" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
        </div>
        <span className="absolute right-2 top-2 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-ink/50">
          사진 크게 · 넘김
        </span>
      </div>
    );
  }

  // marquee — 여러 장이 옆으로
  return (
    <div className={`${frame} flex items-center gap-1.5 bg-ink px-1.5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <PhotoZone
          key={i}
          className="h-[78%] w-1/4 shrink-0 rounded !bg-white/15 !text-white/40"
        />
      ))}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="rounded bg-white/85 px-3 py-1">
          <div className="h-2 w-20 rounded bg-ink/70" />
        </div>
      </div>
      <span className="absolute right-2 top-1.5 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
        사진 여러 장 흐름
      </span>
    </div>
  );
}

export default function HeroSettings({ settings }) {
  const router = useRouter();
  const [mode, setMode] = useState(settings?.hero_mode || "type");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const save = (next) =>
    startTransition(async () => {
      setMsg("");
      setError("");
      const res = await updateHeroMode(next);
      if (res?.error) {
        setError(res.error);
        setMode(settings?.hero_mode || "type"); // 실패하면 되돌림
      } else {
        setMsg("저장됨");
        router.refresh();
        setTimeout(() => setMsg(""), 1500);
      }
    });

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-ink">메인 배너 표시</span>
          <div className="flex gap-1">
            {MODES.map((m) => (
              <button
                key={m.v}
                type="button"
                disabled={pending}
                onClick={() => {
                  setMode(m.v);
                  save(m.v);
                }}
                title={m.desc}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  mode === m.v
                    ? "bg-ink text-white"
                    : "border border-ink/15 text-ink/60 hover:bg-ink/5"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {msg && <span className="text-xs font-medium text-green-600">{msg}</span>}
      </div>

      {error && <p className="mt-2 text-xs font-medium text-primary">{error}</p>}

      {/* 선택한 모드 미리보기 */}
      <div className="mt-4 rounded-lg bg-ink/[0.03] p-4">
        <p className="mb-2 text-xs font-medium text-ink/45">미리보기</p>
        <ModePreview
          mode={mode}
          wordmark={settings?.hero_wordmark || "EVENT LAND"}
          subtitle={settings?.hero_subtitle || "Every Event Has a Story"}
        />
      </div>
    </div>
  );
}
