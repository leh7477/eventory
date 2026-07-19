"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHeroMode } from "@/app/admin/(panel)/banner/actions";

const MODES = [
  { v: "static", label: "한 장 고정", desc: "맨 위 배너 1장을 흐리게 깔고 글자를 얹음" },
  { v: "slide", label: "슬라이드", desc: "대형 배너가 3초마다 한 장씩 넘어감" },
  { v: "marquee", label: "흐르게", desc: "등록된 배너가 옆으로 계속 흐름" },
];

export default function HeroSettings({ settings }) {
  const router = useRouter();
  const [mode, setMode] = useState(settings?.hero_mode || "static");
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
        setMode(settings?.hero_mode || "static"); // 실패하면 되돌림
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

      <p className="mt-2 text-xs text-ink/40">
        <b>한 장 고정</b>은 사진을 밝게 흐려서 분위기만 남깁니다(사진 1장이면 충분).
        <b> 슬라이드</b>는 배너를 흐림 없이 크게 보여주며 3초마다 넘어갑니다(4~5장
        권장). <b>흐르게</b>는 여러 장이 옆으로 계속 흐릅니다(6장 이상 권장).
      </p>
    </div>
  );
}
