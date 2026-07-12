import { createClient } from "@/lib/supabase/server";
import { profileFromUser } from "@/lib/admin/sections";
import { listAdminUsers } from "./actions";
import AccountsManager from "@/components/admin/AccountsManager";

export const revalidate = 0;

export default async function AdminAccountsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = profileFromUser(user);

  if (!profile.isOwner) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-ink">ID 관리</h1>
        <p className="mt-4 rounded-xl border border-dashed border-ink/15 py-16 text-center text-sm text-ink/40">
          최고관리자만 접근할 수 있는 메뉴입니다.
        </p>
      </div>
    );
  }

  const { users } = await listAdminUsers();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">ID 관리</h1>
      <p className="mt-1 text-sm text-ink/50">
        직원 계정을 만들고 메뉴별 접근 권한을 설정합니다.
      </p>

      <div className="mt-6">
        <AccountsManager users={users ?? []} currentUserId={user.id} />
      </div>
    </div>
  );
}
