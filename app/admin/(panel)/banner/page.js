import { createAdminClient } from "@/lib/supabase/admin";
import BannerManager from "@/components/admin/BannerManager";

export const revalidate = 0;

export default async function AdminBannerPage() {
  const admin = createAdminClient();
  const { data: banners } = await admin
    .from("banners")
    .select("*")
    .order("order_num", { ascending: true });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">메인 배너 관리</h1>
      <p className="mt-1 text-sm text-ink/50">
        메인 히어로에 노출되는 배너 이미지를 등록·관리합니다. (위에 있을수록 먼저
        노출)
      </p>

      <div className="mt-6">
        <BannerManager banners={banners ?? []} />
      </div>
    </div>
  );
}
