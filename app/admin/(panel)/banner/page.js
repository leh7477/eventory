import { createAdminClient } from "@/lib/supabase/admin";
import BannerManager from "@/components/admin/BannerManager";
import HeroSettings from "@/components/admin/HeroSettings";

export const revalidate = 0;

export default async function AdminBannerPage() {
  const admin = createAdminClient();
  const [{ data: banners }, { data: settings }] = await Promise.all([
    admin.from("banners").select("*").order("order_num", { ascending: true }),
    admin.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">메인 배너 관리</h1>
      <p className="mt-1 text-sm text-ink/50">
        메인 히어로에 노출되는 배너 이미지를 등록·관리합니다. (위에 있을수록 먼저
        노출)
      </p>

      <div className="mt-6">
        <HeroSettings settings={settings} />
      </div>

      <div className="mt-6">
        <BannerManager banners={banners ?? []} />
      </div>
    </div>
  );
}
