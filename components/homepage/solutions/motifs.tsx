export function PropertyTourMotif() {
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
      <rect width="160" height="100" fill="var(--secondary)" opacity="0.4" />
      <g stroke="var(--brand-foreground)" strokeOpacity="0.8" fill="var(--brand)" fillOpacity="0.14">
        <rect x="40" y="35" width="40" height="45" />
        <rect x="85" y="15" width="30" height="65" />
        <path d="M40 35 L60 20 L80 35" fill="none" />
      </g>
      <circle
        cx="80"
        cy="50"
        r="26"
        fill="none"
        stroke="var(--brand-foreground)"
        strokeDasharray="3 4"
        opacity="0.5"
        style={{ transformOrigin: "80px 50px", animation: "motif-spin 14s linear infinite" }}
      />
    </svg>
  );
}

export function ProjectProgressMotif() {
  const bars = [30, 50, 42, 65, 80];
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
      <rect width="160" height="100" fill="var(--secondary)" opacity="0.4" />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={20 + i * 26}
          y={90 - h}
          width="16"
          height={h}
          fill="var(--brand)"
          fillOpacity={0.15 + i * 0.12}
          stroke="var(--brand-foreground)"
          strokeOpacity="0.5"
        />
      ))}
      <path
        d="M20 70 L46 55 L72 60 L98 35 L124 20"
        stroke="var(--brand-foreground)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}

export function CropIntelligenceMotif() {
  const colors = ["#3f7d4f", "#5c9a5c", "#8fbf6b", "#c9d96a", "#e2c95a"];
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
      <rect width="160" height="100" fill="var(--secondary)" opacity="0.4" />
      {Array.from({ length: 4 }).map((_, r) =>
        Array.from({ length: 6 }).map((_, c) => (
          <rect
            key={`${r}-${c}`}
            x={10 + c * 24}
            y={12 + r * 20}
            width="21"
            height="17"
            fill={colors[(r + c) % colors.length]}
            opacity="0.55"
          />
        )),
      )}
    </svg>
  );
}

export function PrecisionAgricultureMotif() {
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
      <rect width="160" height="100" fill="var(--secondary)" opacity="0.4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <line
          key={i}
          x1="8"
          y1={16 + i * 16}
          x2="152"
          y2={16 + i * 16}
          stroke="var(--brand)"
          strokeOpacity="0.18"
          strokeWidth="10"
        />
      ))}
      <path
        d="M12 84 C 50 60, 90 70, 140 20"
        stroke="var(--route)"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        fill="none"
        opacity="0.8"
      />
      <circle cx="140" cy="20" r="3.5" fill="var(--brand-foreground)" />
    </svg>
  );
}

export function PowerLineMotif() {
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
      <rect width="160" height="100" fill="var(--secondary)" opacity="0.4" />
      {[28, 80, 132].map((x, i) => (
        <g key={i} stroke="var(--brand-foreground)" strokeOpacity="0.75" fill="none">
          <path d={`M${x} 92 L${x} 30 M${x - 14} 38 L${x + 14} 38 M${x - 10} 50 L${x + 10} 50`} />
        </g>
      ))}
      <path d="M14 38 C 45 50, 65 26, 94 38 S 140 50, 146 38" stroke="var(--brand)" strokeOpacity="0.55" fill="none" />
      <path d="M14 50 C 45 62, 65 38, 94 50 S 140 62, 146 50" stroke="var(--brand)" strokeOpacity="0.4" fill="none" />
      <path
        d="M8 78 C 45 70, 90 82, 150 68"
        stroke="var(--route)"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        fill="none"
        opacity="0.8"
      />
      <circle cx="150" cy="68" r="3.5" fill="var(--brand-foreground)" />
    </svg>
  );
}
