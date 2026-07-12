"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_SECTIONS } from "@/lib/admin/sections";
import {
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from "@/app/admin/(panel)/accounts/actions";

const emptyForm = {
  username: "",
  password: "",
  name: "",
  role: "staff",
  permissions: [],
};

function PermissionPicker({ role, permissions, toggle }) {
  if (role === "owner")
    return (
      <p className="text-xs text-ink/45">최고관리자는 모든 메뉴에 접근합니다.</p>
    );
  return (
    <div className="flex flex-wrap gap-1.5">
      {ADMIN_SECTIONS.map((s) => {
        const on = permissions.includes(s.key);
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => toggle(s.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              on
                ? "bg-ink text-white"
                : "border border-ink/15 text-ink/50 hover:bg-ink/5"
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AccountsManager({ users, currentUserId }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // 신규 생성
  const [form, setForm] = useState(emptyForm);
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleNewPerm = (key) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));

  // 편집
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const openEdit = (u) => {
    setEditId(u.id);
    setEditForm({
      username: u.username,
      password: "",
      name: u.name,
      role: u.role,
      permissions: u.permissions,
    });
  };
  const toggleEditPerm = (key) =>
    setEditForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));

  const run = (fn) =>
    startTransition(async () => {
      setError("");
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
      return res;
    });

  const onCreate = (e) => {
    e.preventDefault();
    run(async () => {
      const res = await createAdminUser(form);
      if (!res?.error) setForm(emptyForm);
      return res;
    });
  };

  const inputCls =
    "w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary";
  const roleBadge = (role) =>
    role === "owner"
      ? "bg-primary/10 text-primary"
      : "bg-ink/10 text-ink/60";

  return (
    <div className="space-y-6">
      {/* 계정 목록 */}
      <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
        <p className="border-b border-ink/10 px-4 py-2.5 text-sm font-bold text-ink">
          계정 목록 ({users.length})
        </p>
        <ul className="divide-y divide-ink/5">
          {users.map((u) => (
            <li key={u.id}>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {u.name || "(이름 없음)"}
                    <span className="ml-2 text-xs font-normal text-ink/45">
                      @{u.username}
                    </span>
                    {u.id === currentUserId && (
                      <span className="ml-1.5 text-[11px] text-ink/40">(나)</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {u.role === "owner"
                      ? "전체 메뉴"
                      : u.permissions.length
                      ? ADMIN_SECTIONS.filter((s) =>
                          u.permissions.includes(s.key)
                        )
                          .map((s) => s.label)
                          .join(", ")
                      : "접근 권한 없음"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${roleBadge(u.role)}`}
                >
                  {u.role === "owner" ? "최고관리자" : "직원"}
                </span>
                <button
                  type="button"
                  onClick={() => (editId === u.id ? setEditId(null) : openEdit(u))}
                  className="shrink-0 rounded-md border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 hover:bg-ink/5"
                >
                  {editId === u.id ? "닫기" : "수정"}
                </button>
                <button
                  type="button"
                  disabled={pending || u.id === currentUserId}
                  onClick={() => {
                    if (confirm(`'${u.name || u.username}' 계정을 삭제할까요?`))
                      run(() => deleteAdminUser(u.id));
                  }}
                  className="shrink-0 rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-30"
                >
                  삭제
                </button>
              </div>

              {/* 편집 */}
              {editId === u.id && (
                <div className="space-y-3 border-t border-ink/5 bg-ink/[0.015] px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-ink/50">이름</label>
                      <input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-ink/50">
                        새 비밀번호 (변경 시에만)
                      </label>
                      <input
                        type="password"
                        value={editForm.password}
                        placeholder="비워두면 유지"
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, password: e.target.value }))
                        }
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-ink/50">권한 등급</label>
                    <div className="flex gap-1.5">
                      {["staff", "owner"].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setEditForm((f) => ({ ...f, role: r }))}
                          className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                            editForm.role === r
                              ? "bg-ink text-white"
                              : "border border-ink/15 text-ink/50 hover:bg-ink/5"
                          }`}
                        >
                          {r === "owner" ? "최고관리자" : "직원"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-ink/50">
                      접근 가능 메뉴
                    </label>
                    <PermissionPicker
                      role={editForm.role}
                      permissions={editForm.permissions}
                      toggle={toggleEditPerm}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const res = await updateAdminUser(u.id, editForm);
                          if (!res?.error) setEditId(null);
                          return res;
                        })
                      }
                      className="rounded-md bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-60"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="rounded-md border border-ink/15 px-4 py-2 text-xs text-ink/60 hover:bg-ink/5"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* 신규 계정 */}
      <form onSubmit={onCreate} className="rounded-xl border border-ink/10 bg-white p-5">
        <p className="text-sm font-bold text-ink">직원 계정 추가</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">아이디</label>
            <input
              value={form.username}
              onChange={(e) => setF("username", e.target.value)}
              placeholder="영문/숫자/_ (예: staff01)"
              className={inputCls}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">비밀번호</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setF("password", e.target.value)}
              placeholder="6자 이상"
              className={inputCls}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">이름</label>
            <input
              value={form.name}
              onChange={(e) => setF("name", e.target.value)}
              placeholder="담당자 이름"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">권한 등급</label>
            <div className="flex gap-1.5">
              {["staff", "owner"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setF("role", r)}
                  className={`rounded-md px-3 py-2 text-xs font-bold ${
                    form.role === r
                      ? "bg-ink text-white"
                      : "border border-ink/15 text-ink/50 hover:bg-ink/5"
                  }`}
                >
                  {r === "owner" ? "최고관리자" : "직원"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1.5 block text-xs font-medium text-ink/60">
            접근 가능 메뉴
          </label>
          <PermissionPicker
            role={form.role}
            permissions={form.permissions}
            toggle={toggleNewPerm}
          />
        </div>
        {error && <p className="mt-3 text-sm font-medium text-primary">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-md bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
        >
          {pending ? "처리 중..." : "계정 추가"}
        </button>
      </form>
    </div>
  );
}
