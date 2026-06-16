// Transisi antar halaman ditangani View Transitions API (lihat ::view-transition di globals.css
// + ViewTransitions provider di layout). Template dibiarkan passthrough agar tidak dobel animasi.
export default function Template({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
