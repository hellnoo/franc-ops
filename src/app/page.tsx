export default function Home() {
  return (
    <div className="min-h-screen bg-forest flex flex-col items-center justify-center text-center px-6">
      <div className="mb-10">
        <div className="font-serif text-5xl font-black text-emerald-400 tracking-tight leading-none">
          Hall-U
        </div>
        <div className="text-white/30 text-[0.65rem] tracking-[5px] uppercase mt-1">Café</div>
        <p className="text-white/50 text-sm mt-6 max-w-xs leading-relaxed">
          Scan QR code di meja kamu untuk melihat menu dan memesan langsung dari HP.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <a
          href="/kasir"
          className="block w-full bg-emerald-500 hover:bg-emerald-400 text-white py-3.5 rounded-2xl font-semibold text-center transition-colors"
        >
          Dashboard Kasir
        </a>
        <a
          href="/admin"
          className="block w-full bg-white/10 hover:bg-white/15 text-white/80 py-3.5 rounded-2xl font-medium text-center transition-colors"
        >
          Admin Panel
        </a>
      </div>

      <p className="text-white/20 text-xs mt-12">Hall-U Café · Ternate</p>
    </div>
  )
}
