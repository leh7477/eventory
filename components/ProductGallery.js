"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProductGallery({ images = [], name }) {
  const [active, setActive] = useState(0);
  const hasImages = images.length > 0;
  const main = hasImages ? images[active]?.image_url : null;

  return (
    <div>
      {/* 메인 이미지 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-cream">
        {main ? (
          <Image
            src={main}
            alt={name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-festive">
            <span className="font-heading text-2xl font-bold tracking-widest text-white/80">
              EVENTORY
            </span>
          </div>
        )}
      </div>

      {/* 썸네일 */}
      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {images.map((img, i) => (
            <button
              key={img.image_url + i}
              type="button"
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={img.image_url}
                alt={`${name} ${i + 1}`}
                fill
                sizes="20vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
