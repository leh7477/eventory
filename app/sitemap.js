import { getCases } from "@/lib/data";
import { SITE_URL } from "@/lib/constants";

// 새 사례 등록 시 자동 반영되도록 항상 최신으로 생성
export const revalidate = 0;

export default async function sitemap() {
  const cases = await getCases();

  const staticRoutes = ["", "/cases", "/about", "/contact"].map((p) => ({
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

  return [...staticRoutes, ...caseRoutes];
}
