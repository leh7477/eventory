import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "관리자 | Eventory",
};

export default async function AdminPanelLayout({ children }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 미들웨어가 1차 보호하지만 서버에서도 한 번 더 확인
  if (!user) redirect("/admin");

  return (
    <div className="min-h-screen bg-ink/[0.03] font-sans text-ink md:flex">
      <AdminSidebar email={user.email} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
