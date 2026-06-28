"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStoriesMode } from "@/app/admin/(panel)/cases/actions";

const MODES = [
  { v: "off", label: "끄기", desc: "드래그로 수동" },
  { v: "marquee", label: "마퀴", desc: "옆으로 계속 흐름" },
  { v: "carousel", label: "캐러셀", desc: "3장씩 자동 전환" },
];
const SPEEDS = [
  { v: 45, label: "느리게" },
  { v: 30, label: "보통" },
  { v: 18, label: "빠르게" },
];

export default function StoriesSettings({ settings }) {
  const router = useRouter();
  const [mode, setMode] = useState(settings?.home_stories_mode || "off");
  const [speed, setSpeed] = useState(settings?.home_stories_speed || 30);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  const save = (nextMode, nextSpeed) =>
    startTransition(async () => {
      setMsg("");
      const res = await updateStoriesMode(nextMode, nextSpeed);
      if (res?.error) setMsg(res.error);
      else {
        setMsg("저장됨");
        router.refresh();
        setTimeout(() => setMsg(""), 1500);
      }
    });

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* 표시 방식 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-ink">홈 Stories 표시</span>
          <div className="flex gap-1">
            {MODES.map((m) => (
              <button
                key={m.v}
                type="button"
                disabled={pending}
                onClick={() => {
                  setMode(m.v);
                  save(m.v, speed);
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

        {/* 속도 (off가 아닐 때) */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink/50">속도</span>
          <div className="flex gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s.v}
                type="button"
                disabled={pending || mode === "off"}
                onClick={() => {
                  setSpeed(s.v);
                  save(mode, s.v);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  speed === s.v
                    ? "bg-ink text-white"
                    : "border border-ink/15 text-ink/60 hover:bg-ink/5"
                } ${mode === "off" ? "opacity-40" : ""}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {msg && <span className="text-xs font-medium text-green-600">{msg}</span>}
      </div>
      <p className="mt-2 text-xs text-ink/40">
        <b>마퀴</b>는 사진이 옆으로 계속 흐르고, <b>캐러셀</b>은 3장씩(모바일 2장)
        자동으로 넘어갑니다. 마우스를 올리면 멈춰요. 사진이 많아질 때 켜는 걸
        권장합니다.
      </p>
    </div>
  );
}
