import { createAdminClient } from "@/lib/supabase/admin";
import ProductManager from "@/components/admin/ProductManager";

export const revalidate = 0;

export default async function AdminProductsPage() {
  const admin = createAdminClient();

  const [{ data: rawProducts }, { data: categories }] = await Promise.all([
    admin
      .from("products")
      .select("*, categories(name), product_images(image_url, order_num)")
      .order("order_num", { ascending: true }),
    admin.from("categories").select("*").order("order_num", { ascending: true }),
  ]);

  const products = (rawProducts ?? []).map((p) => {
    const imgs = (p.product_images ?? []).sort(
      (a, b) => (a.order_num ?? 0) - (b.order_num ?? 0)
    );
    return {
      ...p,
      thumbnail: imgs[0]?.image_url ?? null,
      categoryName: p.categories?.name ?? null,
    };
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">쇼츠 관리</h1>
      <p className="mt-1 text-sm text-ink/50">
        장비(제품)를 등록합니다. 등록된 제품은 홈 인기 장비(쇼츠)와 장비 목록
        페이지에 노출됩니다.
      </p>

      <div className="mt-6">
        <ProductManager products={products} categories={categories ?? []} />
      </div>
    </div>
  );
}
