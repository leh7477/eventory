import Link from "next/link";
import Image from "next/image";

export default function ProductCard({ product }) {
  const { id, name, thumbnail, categoryName } = product;

  return (
    <Link href={`/products/${id}`} className="group block">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-cream">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-festive">
            <span className="font-heading text-xl font-bold tracking-widest text-white/80">
              EVENTORY
            </span>
          </div>
        )}
        {categoryName && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
            {categoryName}
          </span>
        )}
      </div>
      <h3 className="mt-3 text-sm font-medium text-ink group-hover:text-primary sm:text-base">
        {name}
      </h3>
    </Link>
  );
}
