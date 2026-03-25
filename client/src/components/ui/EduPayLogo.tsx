interface ZaabuPayLogoProps {
  size?: number;
  className?: string;
}

export function ZaabuPayLogo({ size = 40, className = "" }: ZaabuPayLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ep-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0c1445" />
        </linearGradient>
        <linearGradient id="ep-letter" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>
        <linearGradient id="ep-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>

      {/* Background rounded square */}
      <rect width="100" height="100" rx="22" fill="url(#ep-bg)" />

      {/* Subtle inner glow ring */}
      <rect
        x="1" y="1" width="98" height="98" rx="21"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
      />

      {/* === Stylised E === */}
      {/* Vertical spine */}
      <rect x="18" y="17" width="13" height="66" rx="3.5" fill="url(#ep-letter)" />

      {/* Top bar */}
      <rect x="18" y="17" width="50" height="13" rx="3.5" fill="url(#ep-letter)" />

      {/* Middle bar — slightly shorter for style */}
      <rect x="18" y="43.5" width="39" height="12" rx="3.5" fill="url(#ep-letter)" />

      {/* Bottom bar */}
      <rect x="18" y="70" width="50" height="13" rx="3.5" fill="url(#ep-letter)" />

      {/* === Artistic accent: curved swoosh + dot === */}
      {/* Swoosh arc coming off the middle bar */}
      <path
        d="M 57 50 C 68 42, 82 46, 80 60"
        stroke="url(#ep-accent)"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Accent dot at the end of the swoosh */}
      <circle cx="80" cy="61" r="5" fill="url(#ep-accent)" />

      {/* Small leading dot at start of swoosh */}
      <circle cx="57" cy="50" r="2.5" fill="#93c5fd" opacity="0.7" />
    </svg>
  );
}

/* Wordmark version: logo + "ZaabuPay" text side by side */
export function ZaabuPayWordmark({
  size = 36,
  textClass = "text-gray-900",
  className = "",
}: {
  size?: number;
  textClass?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <ZaabuPayLogo size={size} />
      <span className={`font-extrabold tracking-tight ${textClass}`} style={{ fontSize: size * 0.55 }}>
        ZaabuPay
      </span>
    </div>
  );
}
