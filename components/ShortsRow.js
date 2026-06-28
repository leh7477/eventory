"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DragScroll from "@/components/DragScroll";
import { youtubeEmbedUrl } from "@/lib/youtube";

// items: [{ id, name, thumbnail, videoUrl, bg, isSample }]
const CARD =
  "group relative block shrink-0 basis-[calc((100%-1rem)/2)] sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-4rem)/5)]";

function CardInner({ c }) {
  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-cream">
      {c.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.thumbnail}
          alt={c.name}
          draggable={false}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center ${c.bg || "bg-festive"}`}>
          <span className="font-heading text-[11px] font-bold tracking-[0.4em] text-white/25">
            SAMPLE
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent" />

      {c.videoUrl && (
        <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-110">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 text-ink">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      )}

      <h3 className="absolute inset-x-0 bottom-0 p-3 text-sm font-bold text-white">
        {c.name}
      </h3>
    </div>
  );
}

export default function ShortsRow({ items = [] }) {
  const [embed, setEmbed] = useState(null);

  return (
    <>
      <DragScroll className="flex gap-4 pb-2">
        {items.map((c) => {
          if (c.videoUrl) {
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setEmbed(youtubeEmbedUrl(c.videoUrl))}
                className={`${CARD} text-left`}
              >
                <CardInner c={c} />
              </button>
            );
          }
          if (!c.isSample) {
            return (
              <Link key={c.id} href={`/products/${c.id}`} className={CARD}>
                <CardInner c={c} />
              </Link>
            );
          }
          return (
            <div key={c.id} className={CARD}>
              <CardInner c={c} />
            </div>
          );
        })}
      </DragScroll>

      {embed && <VideoModal src={embed} onClose={() => setEmbed(null)} />}
    </>
  );
}

function VideoModal({ src, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-ink/70 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-2xl bg-black shadow-2xl">
        <iframe
          src={`${src}?autoplay=1&rel=0&playsinline=1`}
          title="영상"
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
