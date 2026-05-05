'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function QRPage() {
  const [tableCount, setTableCount] = useState(10)
  const [qrDataUrls, setQrDataUrls] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)

  const generate = async (count: number) => {
    setGenerating(true)
    const base = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
    const urls: string[] = []
    for (let i = 1; i <= count; i++) {
      const url = await QRCode.toDataURL(`${base}/menu?table=${i}`, {
        width: 220, margin: 2,
        color: { dark: '#0a0a0a', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
      urls.push(url)
    }
    setQrDataUrls(urls)
    setGenerating(false)
  }

  useEffect(() => { generate(10) }, [])

  return (
    <div className="min-h-screen bg-h-bg">
      <header className="bg-h-dark border-b border-h-border print:hidden">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-sans text-xl font-black text-white tracking-widest uppercase">HALL-U</div>
            <div className="text-h-red text-[0.55rem] tracking-[3px] uppercase font-semibold mt-0.5">QR Generator</div>
          </div>
          <a href="/admin" className="text-h-muted hover:text-white text-sm transition-colors">← Admin</a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-5 print:hidden">
        <div className="bg-h-card border border-h-border rounded-2xl p-5 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-h-muted font-bold uppercase tracking-wide block mb-1.5">Jumlah Meja (1–30)</label>
            <input type="number" min={1} max={30} value={tableCount}
              onChange={e => setTableCount(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
              className="bg-h-dark border border-h-border rounded-xl px-3.5 py-2.5 w-28 text-sm focus:outline-none focus:border-h-red text-white transition-colors" />
          </div>
          <button onClick={() => generate(tableCount)} disabled={generating}
            className="bg-h-red hover:bg-h-red-d disabled:opacity-60 text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors">
            {generating ? 'Generating...' : 'Generate'}
          </button>
          <button onClick={() => window.print()} disabled={qrDataUrls.length === 0}
            className="border border-h-border hover:border-white/30 text-h-muted hover:text-white disabled:opacity-40 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
            🖨 Cetak Semua
          </button>
          {qrDataUrls.length > 0 && (
            <p className="text-xs text-h-muted self-center">{qrDataUrls.length} QR code siap cetak</p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-10">
        {generating ? (
          <div className="text-center text-h-muted text-sm pt-10">Generating QR codes...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-4 print:gap-3">
            {qrDataUrls.map((url, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 text-center print:rounded-xl print:break-inside-avoid">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`QR Meja ${i + 1}`} className="w-full aspect-square" />
                <div className="font-sans font-black text-h-bg text-sm mt-2 uppercase tracking-wider">Meja {i + 1}</div>
                <div className="text-[0.6rem] text-gray-400 mt-0.5 tracking-widest uppercase">Hall-U Café</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
