import SiteHeaderClient from "@/components/SiteHeaderClient";
import { getCategories } from "@/lib/data";

// 서버에서 카테고리를 조회해 헤더 메뉴로 전달
export default async function SiteHeader() {
  const categories = await getCategories();
  return <SiteHeaderClient categories={categories} />;
}
