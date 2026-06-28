"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 아이디 뒤에 붙는 내부 도메인 (사용자에겐 노출 안 됨)
const ADMIN_DOMAIN = "eventory.local";

export default function AdminLogin() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const email = userId.includes("@") ? userId : `${userId}@${ADMIN_DOMAIN}`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    router.push("/admin/dashboard");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <p className="text-center font-logo text-2xl font-extrabold tracking-tight text-ink">
          EVENTORY
        </p>
        <p className="mt-1 text-center text-sm text-ink/50">관리자 로그인</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">아이디</label>
            <input
              type="text"
              required
              autoComplete="username"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && <p className="text-sm font-medium text-primary">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-ink py-3 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}
