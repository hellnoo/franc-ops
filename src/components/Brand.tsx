// Wordmark "HALL + cangkir-U" (Konsep A) dan monogram H (Konsep B).
// Keduanya pakai currentColor — atur warna via text color, ukuran via className (height).

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 210 64" className={className} role="img" aria-label="Hallu" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="56" fontFamily="var(--font-geist-sans), system-ui, sans-serif" fontSize="60" fontWeight="800" letterSpacing="-1" fill="currentColor">HALL</text>
      <g fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <path d="M152 20 L152 44 Q152 56 168 56 Q184 56 184 44 L184 20" />
        <path d="M184 27 Q198 35 184 46" strokeWidth="9" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.85">
        <path d="M162 11 q5 -5 0 -11" />
        <path d="M174 11 q5 -5 0 -11" />
      </g>
    </svg>
  )
}

export function Monogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Hallu" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.9">
        <path d="M17 14 q4 -5 0 -9" />
        <path d="M24 14 q4 -5 0 -9" />
        <path d="M31 14 q4 -5 0 -9" />
      </g>
      <g fill="currentColor">
        <rect x="13" y="18" width="7" height="22" rx="2" />
        <rect x="28" y="18" width="7" height="22" rx="2" />
        <rect x="13" y="26" width="22" height="7" rx="2" />
      </g>
    </svg>
  )
}
