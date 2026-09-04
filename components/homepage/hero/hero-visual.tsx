export function HeroVisual() {
  return (
    <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl sm:aspect-square">
      <svg
        viewBox="0 0 480 480"
        className="h-full w-full"
        role="img"
        aria-label="Technical illustration of aerial mapping data — a geospatial grid over building and field geometry, with capture coordinates"
      >
        <defs>
          <radialGradient id="hv-glow" cx="50%" cy="20%" r="70%">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hv-scan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-foreground)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--brand-foreground)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--brand-foreground)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="480" height="480" fill="var(--card)" />
        <rect width="480" height="480" fill="url(#hv-glow)" />

        {/* Base geospatial grid */}
        <g opacity="0.5">
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`h-${i}`} x1="0" y1={i * 40} x2="480" y2={i * 40} stroke="var(--border)" strokeWidth="1" />
          ))}
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`v-${i}`} x1={i * 40} y1="0" x2={i * 40} y2="480" stroke="var(--border)" strokeWidth="1" />
          ))}
        </g>

        {/* Real-estate building geometry, left/upper */}
        <g transform="translate(60,90)" stroke="var(--brand-foreground)" strokeOpacity="0.75" fill="var(--brand)" fillOpacity="0.12">
          <rect x="0" y="60" width="70" height="110" />
          <rect x="82" y="20" width="50" height="150" />
          <path d="M0 60 L35 30 L70 60" fill="none" />
        </g>

        {/* Agricultural field geometry, lower/right */}
        <g transform="translate(230,260)" opacity="0.9">
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={col * 45}
                y={row * 32}
                width="42"
                height="29"
                fill="var(--brand)"
                fillOpacity={0.08 + ((row + col) % 3) * 0.06}
                stroke="var(--brand-foreground)"
                strokeOpacity="0.25"
              />
            )),
          )}
        </g>

        {/* Point-cloud / capture markers with coordinates */}
        {[
          { x: 95, y: 150, label: "N 21.03" },
          { x: 300, y: 120, label: "N 19.07" },
          { x: 260, y: 340, label: "E 73.22" },
          { x: 380, y: 200, label: "E 72.85" },
        ].map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="var(--brand-foreground)" />
            <circle
              cx={p.x}
              cy={p.y}
              r="10"
              stroke="var(--brand-foreground)"
              strokeOpacity="0.4"
              fill="none"
              style={{
                transformOrigin: `${p.x}px ${p.y}px`,
                animation: `hero-pulse-ring 2.8s ease-out ${i * 0.5}s infinite`,
              }}
            />
            <text x={p.x + 14} y={p.y + 4} fontSize="9" fill="var(--muted-foreground)" fontFamily="monospace">
              {p.label}
            </text>
          </g>
        ))}

        {/* Drone glyph, top-right */}
        <g transform="translate(390,60)" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round">
          <circle cx="0" cy="0" r="4" fill="var(--foreground)" stroke="none" />
          <path d="M-18 -3 h10 M8 -3 h10 M-3 -18 v10 M-3 8 v10" transform="translate(3,3)" />
          {[[-14, -14], [14, -14], [-14, 14], [14, 14]].map(([x, y], i) => (
            <circle key={i} cx={x + 3} cy={y + 3} r="4" fill="var(--foreground)" stroke="none" opacity="0.85" />
          ))}
        </g>

        {/* Scan sweep */}
        <rect
          x="0"
          y="0"
          width="480"
          height="90"
          fill="url(#hv-scan)"
          style={{ animation: "hv-scan 5s ease-in-out infinite" }}
        />

        <rect x="0.5" y="0.5" width="479" height="479" fill="none" stroke="var(--border)" />
      </svg>

      <div className="border-border/60 bg-background/70 pointer-events-none absolute bottom-3 left-3 rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-wide backdrop-blur">
        CAPTURE · PROCESS · MAP · ANALYZE
      </div>
    </div>
  );
}
