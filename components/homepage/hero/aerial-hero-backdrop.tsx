import Image from "next/image";

// Realistic aerial-landscape backdrop for the homepage "Choose Service" / Raider System section.
//
// Background only: a natural oblique aerial view (agricultural fields, a river, a farm road, subtle farm
// infrastructure and distant hills) in a restrained sage / muted-blue / warm-ivory palette, replacing the earlier
// illustrated sky, cartoon skyline and flat ground. The wrapper keeps the same absolute, behind-content,
// non-interactive footprint as before, so the section's height, spacing, layout and foreground UI are unchanged.
//
// Purely decorative: aria-hidden, pointer-events-none, sits behind the section content (negative z-index).
// The image is a local asset (/public/images/aerial-landscape.webp) — swapping in a licensed photograph later is
// a one-line `src` change.
export function AerialHeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <Image
        src="/images/aerial-landscape.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[50%_35%]"
      />

      {/* Soft warm-ivory wash so the foreground heading, cards and map stay fully readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(248,244,232,0.46) 0%, rgba(248,244,232,0.22) 30%, rgba(248,244,232,0.12) 55%, rgba(248,244,232,0.30) 100%)",
        }}
      />
    </div>
  );
}
