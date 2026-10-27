import Image from "next/image";

// Physical world -> digital twin. Two registered layers of the same site: an aerial view of farmland, river and
// buildings, dissolving (soft diagonal mask) into its digital twin — terrain mesh, elevation contours, extruded
// building models, a vegetation point cloud and AI detection marks. Restrained survey details sit on top.
//
// Assets: /images/hero-reality.webp and /images/hero-digital-twin.webp (identical framing, so the layers align).
const DISSOLVE = "linear-gradient(100deg, transparent 38%, rgba(0,0,0,0.55) 50%, #000 62%)";

export function HeroVisual() {
  return (
    <div
      className="relative aspect-4/5 w-full overflow-hidden rounded-2xl bg-[#14304a] sm:aspect-square"
      role="img"
      aria-label="Aerial photograph of farmland, a river and buildings dissolving into its digital twin — terrain mesh, elevation contours, 3D building models and a vegetation point cloud"
    >
      <Image
        src="/images/hero-reality.webp"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 520px, 100vw"
        className="object-cover"
      />
      <Image
        src="/images/hero-digital-twin.webp"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 520px, 100vw"
        className="object-cover"
        style={{ WebkitMaskImage: DISSOLVE, maskImage: DISSOLVE }}
      />

      {/* Survey details: registration marks, dissolve line and coordinates */}
      <svg
        viewBox="0 0 480 480"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="hv-line" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1" fill="none" strokeLinecap="square">
          <path d="M14 30 V14 H30" />
          <path d="M450 14 H466 V30" />
          <path d="M14 450 V466 H30" />
          <path d="M466 450 V466 H450" />
        </g>
        <line x1="282" y1="0" x2="198" y2="480" stroke="url(#hv-line)" strokeWidth="1" />
        <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1">
          {Array.from({ length: 11 }).map((_, i) => {
            const t = (i + 1) / 12;
            const x = 282 - 84 * t;
            const y = 480 * t;
            return <line key={i} x1={x - 3} y1={y} x2={x + 3} y2={y} />;
          })}
        </g>
        <circle cx="240" cy="240" r="3" fill="none" stroke="#ffffff" strokeOpacity="0.85" />
        <circle cx="240" cy="240" r="9" fill="none" stroke="#ffffff" strokeOpacity="0.35" />
        <g
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="8.5"
          letterSpacing="0.6"
          fill="#e6f2fb"
          fillOpacity="0.85"
          textAnchor="end"
        >
          <text x="452" y="52">19.0596° N</text>
          <text x="452" y="64">72.8656° E</text>
        </g>
      </svg>

      <div className="border-border/60 bg-background/70 pointer-events-none absolute bottom-3 left-3 rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-wide backdrop-blur">
        CAPTURE · PROCESS · MAP · ANALYZE
      </div>
    </div>
  );
}
