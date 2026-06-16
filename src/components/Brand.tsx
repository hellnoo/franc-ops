// Wordmark "HALL + cangkir-U" (Konsep A) dan monogram H (Konsep B).
// Keduanya pakai currentColor — atur warna via text color, ukuran via className (height).

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 196 64" className={className} role="img" aria-label="Hallu" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="56" fontFamily="var(--font-geist-sans), system-ui, sans-serif" fontSize="60" fontWeight="800" letterSpacing="-1" fill="currentColor">HALL</text>
      <g fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <path d="M140 18 L140 44 Q140 56 156 56 Q172 56 172 44 L172 18" />
        <path d="M172 26 Q186 35 172 47" strokeWidth="9" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.9">
        <path d="M150 9 q5 -5 0 -10" />
        <path d="M162 9 q5 -5 0 -10" />
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
