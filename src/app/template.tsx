// template.tsx re-mount tiap navigasi → animasi "page-enter" jalan setiap pindah halaman,
// memberi efek sinematik depth/3D saat berpindah ruang/halaman.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
