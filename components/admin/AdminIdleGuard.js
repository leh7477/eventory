"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IDLE_MS, WARN_MS } from "@/lib/admin/session";

// 관리자 무활동 자동 로그아웃 — 활동 = 페이지 이동.
// 마지막 페이지 이동 후 IDLE_MS(2시간)가 지나면 로그아웃, 만료 WARN_MS(10분) 전에
// "로그인 유지 / 로그아웃" 팝업을 띄운다.
const STORE_KEY = "admin_last_nav"; // 여러 탭 중 한 곳에서라도 이동하면 다른 탭도 안 튕기게 공유

function readStore() {
  try {
    return Number(localStorage.getItem(STORE_KEY)) || 0;
  } catch {
    return 0;
  }
}
function writeStore(t) {
  try {
    localStorage.setItem(STORE_KEY, String(t));
  } catch {
    // 저장소를 못 써도(시크릿 모드 등) 이 탭 안에서는 정상 동작
  }
}

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function AdminIdleGuard() {
  const pathname = usePathname();
  const startRef = useRef(Date.now());
  const [left, setLeft] = useState(null); // 경고 구간일 때만 남은 ms
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    try {
      await createClient().auth.signOut();
    } catch {
      // 실패해도 로그인 화면으로 이동 (서버 활동 쿠키 만료가 한 번 더 막아줌)
    }
    window.location.assign("/admin");
  };

  // 페이지 이동 = 활동: 타이머 리셋
  useEffect(() => {
    const now = Date.now();
    startRef.current = now;
    writeStore(now);
    setLeft(null);
  }, [pathname]);

  // 1초마다 남은 시간 계산 (탭이 백그라운드여도 시각 기준이라 정확)
  useEffect(() => {
    const tick = () => {
      const last = Math.max(startRef.current, readStore());
      const remain = IDLE_MS - (Date.now() - last);
      if (remain <= 0) {
        logout();
      } else if (remain <= WARN_MS) {
        setLeft(remain);
      } else {
        setLeft(null);
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로그인 유지: 서버 활동 쿠키를 갱신하고 타이머 리셋
  const keep = async () => {
    setBusy(true);
    try {
      const res = await fetch("/admin/keepalive", {
        cache: "no-store",
        credentials: "same-origin",
        redirect: "manual",
      });
      if (res.status !== 204) {
        // 이미 서버에서 만료된 경우 — 로그인 화면으로
        window.location.assign("/admin");
        return;
      }
      const now = Date.now();
      startRef.current = now;
      writeStore(now);
      setLeft(null);
    } catch {
      window.location.assign("/admin");
    } finally {
      setBusy(false);
    }
  };

  if (left === null) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label="로그인 유지 확인"
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-2xl">
        <p className="text-sm font-bold text-ink/50">로그인 유지</p>
        <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-ink">
          {fmt(left)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          장시간 이동이 없어 곧 자동으로 로그아웃됩니다.
          <br />
          계속 사용하시겠어요?
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={keep}
            disabled={busy}
            className="flex-1 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
          >
            로그인 유지
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink/60 hover:bg-ink/5"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
