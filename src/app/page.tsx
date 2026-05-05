export default function Home() {
  return (
    <div className="min-h-screen bg-h-bg flex flex-col items-center justify-center text-center px-6">
      <div className="mb-12">
        <div className="font-sans text-5xl font-black text-white tracking-widest leading-none uppercase">
          HALL-U
        </div>
        <div className="flex items-center gap-2 justify-center mt-2">
          <div className="h-px w-8 bg-h-red" />
          <div className="text-h-red text-[0.6rem] tracking-[4px] uppercase font-semibold">
            Coffee &amp; Sociality
          </div>
          <div className="h-px w-8 bg-h-red" />
        </div>
        <p className="text-white/30 text-xs mt-8 max-w-xs leading-relaxed">
          Scan QR code di meja kamu untuk melihat menu dan memesan langsung dari HP.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <a
          href="/kasir"
          className="block w-full bg-h-red hover:bg-h-red-d text-white py-3.5 rounded-xl font-bold text-sm text-center transition-colors tracking-wide uppercase"
        >
          Dashboard Kasir
        </a>
        <a
          href="/admin"
          className="block w-full border border-h-border hover:border-white/20 text-white/50 hover:text-white/80 py-3.5 rounded-xl font-medium text-sm text-center transition-colors"
        >
          Admin Panel
        </a>
      </div>

      <p className="text-white/10 text-xs mt-16 tracking-widest uppercase">Ternate · Indonesia</p>
    </div>
  )
}
