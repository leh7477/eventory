"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// 로그인한 본인의 비밀번호 변경 (현재 비밀번호 확인 후 변경)
export default function PasswordChangeModal({ email, onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (next.length < 6) return setError("새 비밀번호는 6자 이상이어야 합니다.");
    if (next !== confirm) return setError("새 비밀번호가 서로 다릅니다.");
    if (next === current) return setError("현재 비밀번호와 다른 값을 입력해주세요.");

    setLoading(true);
    const supabase = createClient();

    // 1) 현재 비밀번호 확인 (본인 확인)
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInErr) {
      setLoading(false);
      return setError("현재 비밀번호가 올바르지 않습니다.");
    }

    // 2) 새 비밀번호로 변경
    const { error: updErr } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (updErr) return setError("변경에 실패했습니다. 잠시 후 다시 시도해주세요.");

    setDone(true);
  };

  const inputCls =
    "w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        {done ? (
          <>
            <p className="text-base font-bold text-ink">비밀번호가 변경되었습니다</p>
            <p className="mt-2 text-sm text-ink/60">
              다음 로그인부터 새 비밀번호를 사용해주세요.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-md bg-ink py-2.5 text-sm font-bold text-white hover:bg-black"
            >
              확인
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="text-base font-bold text-ink">비밀번호 변경</p>
            <p className="mt-1 text-xs text-ink/50">
              {(email ?? "").replace("@eventory.local", "")} 계정
            </p>

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-ink/50">현재 비밀번호</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink/50">
                  새 비밀번호 (6자 이상)
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink/50">새 비밀번호 확인</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm font-medium text-primary">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-md bg-ink py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
              >
                {loading ? "변경 중..." : "변경하기"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-ink/15 px-4 py-2.5 text-sm text-ink/60 hover:bg-ink/5"
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
