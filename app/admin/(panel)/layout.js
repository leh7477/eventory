import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileFromUser } from "@/lib/admin/sections";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminIdleGuard from "@/components/admin/AdminIdleGuard";

export const metadata = {
  title: "관리자 | 이벤트랜드",
};

export default async function AdminPanelLayout({ children }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 미들웨어가 1차 보호하지만 서버에서도 한 번 더 확인
  if (!user) redirect("/admin");

  const profile = profileFromUser(user);

  // 신규(미처리) 견적 문의 건수 — 사이드바 배지용
  let newInquiries = 0;
  if (profile.isOwner || profile.permissions.includes("inquiries")) {
    // 신규 = status 'new' & 아직 처리(회신)되지 않은 건
    const { count } = await createAdminClient()
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")
      .or("handled.is.null,handled.eq.false");
    newInquiries = count ?? 0;
  }

  return (
    <div className="min-h-screen bg-ink/[0.03] font-sans text-ink md:flex">
      <AdminIdleGuard />
      <AdminSidebar
        email={user.email}
        isOwner={profile.isOwner}
        permissions={profile.permissions}
        newInquiries={newInquiries}
      />
      <main className="min-w-0 max-w-full flex-1 overflow-x-hidden px-4 py-6 md:px-6 md:py-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
