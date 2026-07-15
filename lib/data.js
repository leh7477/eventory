import { createPublicClient } from "@/lib/supabase/public";
import { youtubeThumb } from "@/lib/youtube";

const DEFAULT_SETTINGS = {
  home_stories_mode: "off", // off | marquee | carousel
  home_stories_speed: 30,
};

// 사이트 설정 (단일 행). 테이블 없으면 기본값.
export async function getSettings() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return data;
}

// 활성 배너 (순서대로)
export async function getActiveBanners() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("order_num", { ascending: true });
  if (error) {
    console.error("getActiveBanners:", error.message);
    return [];
  }
  return data ?? [];
}

// 카테고리 (순서대로)
export async function getCategories() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("order_num", { ascending: true });
  if (error) {
    console.error("getCategories:", error.message);
    return [];
  }
  return data ?? [];
}

// 제품 목록 (이미지 + 카테고리 조인). categoryId 주면 해당 카테고리만.
export async function getProducts({ categoryId = null, limit = null } = {}) {
  const supabase = createPublicClient();
  let query = supabase
    .from("products")
    .select("*, categories(name), product_images(image_url, order_num)")
    .eq("is_active", true)
    .order("order_num", { ascending: true });

  if (categoryId) query = query.eq("category_id", categoryId);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("getProducts:", error.message);
    return [];
  }
  // 각 제품의 이미지 정렬 + 대표 이미지 계산
  return (data ?? []).map((p) => {
    const images = (p.product_images ?? []).sort(
      (a, b) => (a.order_num ?? 0) - (b.order_num ?? 0)
    );
    return {
      ...p,
      images,
      thumbnail: images[0]?.image_url ?? youtubeThumb(p.video_url) ?? null,
      categoryName: p.categories?.name ?? null,
    };
  });
}

// 단일 제품 상세
export async function getProductById(id) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name), product_images(image_url, order_num)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getProductById:", error.message);
    return null;
  }
  if (!data) return null;
  const images = (data.product_images ?? []).sort(
    (a, b) => (a.order_num ?? 0) - (b.order_num ?? 0)
  );
  return {
    ...data,
    images,
    thumbnail: images[0]?.image_url ?? null,
    categoryName: data.categories?.name ?? null,
  };
}

// 행사 사례
export async function getCases({ limit = null } = {}) {
  const supabase = createPublicClient();
  let query = supabase
    .from("cases")
    .select("*")
    .order("order_num", { ascending: true });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("getCases:", error.message);
    return [];
  }
  return data ?? [];
}

// 단일 사례 상세 (현장 사진 여러 장 = case_images, 없으면 image_url 1장)
export async function getCaseById(id) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("cases")
    .select("*, case_images(image_url, order_num)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const imgs = (data.case_images ?? [])
    .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
    .map((x) => x.image_url);
  const images = imgs.length > 0 ? imgs : data.image_url ? [data.image_url] : [];
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    tags: data.tags,
    specs: data.specs ?? null,
    seoTitle: data.seo_title ?? null,
    seoDescription: data.seo_description ?? null,
    seoBody: data.seo_body ?? null,
    images,
  };
}
