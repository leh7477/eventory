"use client";

import Link from "next/link";
import DragScroll from "@/components/DragScroll";

// items: [{ id, title, description, image, tags }]
// layout: "row"(가로 드래그 스크롤, 기본) | "grid"(갤러리 그리드)
// 클릭 시 /cases/[id] 상세(포트폴리오) 페이지로 이동
export default function CaseGallery({ items = [], layout = "row" }) {
  const isGrid = layout === "grid";

  const cardClass = isGrid
    ? "group block w-full"
    : "group block shrink-0 basis-[calc((100%-1rem)/2)] sm:basis-[calc((100%-2rem)/3)]";

  const cards = items.map((c) => (
    <Link key={c.id} href={`/cases/${c.id}`} className={cardClass}>
      <div
        className={`relative aspect-square overflow-hidden ${
          isGrid ? "bg-ink/5" : "rounded-xl bg-cream"
        }`}
      >
        {c.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.image}
            alt={c.title}
            draggable={false}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-festive">
            <span className="font-heading font-bold tracking-widest text-white/80">
              EVENTORY
            </span>
          </div>
        )}
      </div>
      <h3 className={`text-center font-semibold text-ink ${isGrid ? "mt-4" : "mt-3"} text-sm sm:text-base`}>
        {c.title}
      </h3>
      {c.description && (
        <p className="mt-1 line-clamp-1 text-center text-xs text-ink/55 sm:text-sm">
          {c.description}
        </p>
      )}
    </Link>
  ));

  if (isGrid) {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3">{cards}</div>
    );
  }
  return <DragScroll className="flex gap-4 pb-2">{cards}</DragScroll>;
}
