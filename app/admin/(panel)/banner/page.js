import { createAdminClient } from "@/lib/supabase/admin";
import BannerManager from "@/components/admin/BannerManager";
import HeroSettings from "@/components/admin/HeroSettings";
import HeroTextEditor from "@/components/admin/HeroTextEditor";

export const revalidate = 0;

export default async function AdminBannerPage() {
  const admin = createAdminClient();
  const [{ data: banners }, { data: settings }] = await Promise.all([
    admin.from("banners").select("*").order("order_num", { ascending: true }),
    admin.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  // 히어로가 타이포 모드면 사진 배너가 화면에 안 나옴 = 현재 미사용
  const bannerUnused = (settings?.hero_mode || "type") === "type";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-ink">메인 배너 관리</h1>
        {bannerUnused && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
            현재 미사용
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink/50">
        메인 히어로에 노출되는 배너 이미지를 등록·관리합니다. (위에 있을수록 먼저
        노출)
      </p>

      {bannerUnused && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          지금 메인 히어로가 <b>타이포(글자) 디자인</b>이라, 여기 등록한 사진
          배너는 <b>홈 화면에 나오지 않습니다.</b> 사진 배너를 쓰려면 아래 “메인
          배너 표시”에서 <b>한 장 고정 · 슬라이드 · 흐르게</b> 중 하나로 바꿔주세요.
        </div>
      )}

      <div className="mt-6">
        <HeroSettings settings={settings} />
      </div>

      {/* 타이포 모드일 때 화면에 나오는 문구 편집 */}
      {bannerUnused && (
        <div className="mt-6">
          <HeroTextEditor settings={settings} />
        </div>
      )}

      <div className="mt-6">
        <BannerManager banners={banners ?? []} />
      </div>
    </div>
  );
}
