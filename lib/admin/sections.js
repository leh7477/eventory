// 관리자 메뉴(권한 단위) 정의 — 서버/클라이언트/미들웨어 공용
export const ADMIN_SECTIONS = [
  { key: "banner", href: "/admin/banner", label: "메인 배너" },
  { key: "categories", href: "/admin/categories", label: "카테고리" },
  { key: "products", href: "/admin/products", label: "중단 배너" },
  { key: "cases", href: "/admin/cases", label: "Stories" },
  { key: "inquiries", href: "/admin/inquiries", label: "견적 문의" },
  { key: "schedule", href: "/admin/schedule", label: "행사 일정" },
  { key: "stats", href: "/admin/stats", label: "매출 통계" },
];

export const ALL_SECTION_KEYS = ADMIN_SECTIONS.map((s) => s.key);

// Supabase 유저 → 관리자 프로필(권한) 추출
// user_metadata: { name, role: 'owner'|'staff', permissions: string[] }
// role 이 없는 시드 계정은 owner(전체 권한)로 간주
export function profileFromUser(user) {
  const meta = user?.user_metadata || {};
  const role = meta.role === "staff" ? "staff" : "owner";
  const isOwner = role === "owner";
  const permissions = isOwner
    ? ALL_SECTION_KEYS
    : Array.isArray(meta.permissions)
    ? meta.permissions
    : [];
  return { name: meta.name || "", role, isOwner, permissions };
}

// 특정 메뉴 접근 가능 여부
export function canAccess(profile, key) {
  if (profile.isOwner) return true;
  if (key === "accounts") return false; // ID 관리는 owner 전용
  return profile.permissions.includes(key);
}

// 경로 → 메뉴 key
export function sectionKeyForPath(pathname) {
  if (pathname.startsWith("/admin/accounts")) return "accounts";
  const s = ADMIN_SECTIONS.find((x) => pathname.startsWith(x.href));
  return s?.key ?? null;
}
