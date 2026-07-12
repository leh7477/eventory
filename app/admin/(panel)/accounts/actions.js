"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileFromUser, ALL_SECTION_KEYS } from "@/lib/admin/sections";

const ADMIN_DOMAIN = "eventory.local";

// owner(최고관리자)만 계정 관리 가능
async function requireOwner() {
  const user = await requireAdmin();
  if (!profileFromUser(user).isOwner) throw new Error("Forbidden");
  return user;
}

const cleanPerms = (perms) =>
  Array.isArray(perms) ? perms.filter((p) => ALL_SECTION_KEYS.includes(p)) : [];

function rv() {
  revalidatePath("/admin/accounts");
}

export async function listAdminUsers() {
  await requireOwner();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return { error: error.message, users: [] };
  const users = (data?.users ?? [])
    .map((u) => {
      const p = profileFromUser(u);
      return {
        id: u.id,
        username: (u.email || "").replace(`@${ADMIN_DOMAIN}`, ""),
        name: p.name,
        role: p.role,
        permissions: p.permissions,
        created_at: u.created_at,
      };
    })
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  return { users };
}

export async function createAdminUser({ username, password, name, role, permissions }) {
  await requireOwner();
  const id = (username || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(id))
    return { error: "아이디는 영문/숫자/_ 3~20자로 입력하세요." };
  if (!password || password.length < 6)
    return { error: "비밀번호는 6자 이상이어야 합니다." };
  if (!name?.trim()) return { error: "이름을 입력하세요." };

  const isOwner = role === "owner";
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: `${id}@${ADMIN_DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: {
      name: name.trim(),
      role: isOwner ? "owner" : "staff",
      permissions: isOwner ? [] : cleanPerms(permissions),
    },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message))
      return { error: "이미 존재하는 아이디입니다." };
    return { error: "계정 생성에 실패했습니다: " + error.message };
  }
  rv();
  return { ok: true };
}

export async function updateAdminUser(userId, { name, role, permissions, password }) {
  await requireOwner();
  const admin = createAdminClient();
  const isOwner = role === "owner";

  const payload = {
    user_metadata: {
      name: (name || "").trim(),
      role: isOwner ? "owner" : "staff",
      permissions: isOwner ? [] : cleanPerms(permissions),
    },
  };
  if (password) {
    if (password.length < 6) return { error: "비밀번호는 6자 이상이어야 합니다." };
    payload.password = password;
  }
  const { error } = await admin.auth.admin.updateUserById(userId, payload);
  if (error) return { error: "수정에 실패했습니다: " + error.message };
  rv();
  return { ok: true };
}

export async function deleteAdminUser(userId) {
  const me = await requireOwner();
  if (userId === me.id) return { error: "본인 계정은 삭제할 수 없습니다." };

  const admin = createAdminClient();
  // 마지막 owner 보호
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const owners = (data?.users ?? []).filter((u) => profileFromUser(u).isOwner);
  const target = (data?.users ?? []).find((u) => u.id === userId);
  if (target && profileFromUser(target).isOwner && owners.length <= 1)
    return { error: "마지막 최고관리자는 삭제할 수 없습니다." };

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: "삭제에 실패했습니다: " + error.message };
  rv();
  return { ok: true };
}
