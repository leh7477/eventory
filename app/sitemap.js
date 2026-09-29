import { getCases, getProducts } from "@/lib/data";
import { SITE_URL } from "@/lib/constants";

// 새 사례·장비 등록 시 자동 반영되도록 항상 최신으로 생성
export const revalidate = 0;

export default async function sitemap() {
  const [cases, products] = await Promise.all([getCases(), getProducts()]);

  const staticRoutes = ["", "/products", "/cases", "/about", "/contact"].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));

  const caseRoutes = cases.map((c) => ({
    url: `${SITE_URL}/cases/${c.id}`,
    lastModified: c.created_at ? new Date(c.created_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // 장비 상세 — 검색 유입이 가장 많이 걸리는 페이지라 빠지면 안 된다
  const productRoutes = products.map((p) => ({
    url: `${SITE_URL}/products/${p.id}`,
    lastModified: p.created_at ? new Date(p.created_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...caseRoutes, ...productRoutes];
}
