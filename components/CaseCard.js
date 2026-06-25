import Image from "next/image";

// 매거진/Pinterest 스타일 카드 (높이 가변)
export default function CaseCard({ item }) {
  const { title, image_url, tags } = item;

  return (
    <figure className="mb-4 break-inside-avoid overflow-hidden rounded-xl bg-navy/5">
      <div className="relative w-full">
        {image_url ? (
          <Image
            src={image_url}
            alt={title}
            width={600}
            height={800}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="h-auto w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-navy to-[#1b1f4d]">
            <span className="font-heading tracking-widest text-gold/60">
              EVENTORY
            </span>
          </div>
        )}
      </div>
      <figcaption className="p-4">
        <h3 className="text-sm font-semibold text-ink sm:text-base">{title}</h3>
        {Array.isArray(tags) && tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-navy/5 px-2.5 py-1 text-xs text-navy/70"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </figcaption>
    </figure>
  );
}
