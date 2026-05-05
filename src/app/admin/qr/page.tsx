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
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')
    const urls: string[] = []
    for (let i = 1; i <= count; i++) {
      const dataUrl = await QRCode.toDataURL(`${base}/menu?table=${i}`, {
        width: 220,
        margin: 2,
        color: { dark: '#064e3b', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
      urls.push(dataUrl)
    }
    setQrDataUrls(urls)
    setGenerating(false)
  }

  useEffect(() => {
    generate(10)
  }, [])

  return (
    <div className="min-h-screen bg-warm">
      {/* Header */}
      <header className="bg-forest shadow-lg print:hidden">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-serif text-xl font-black text-emerald-400">Hall-U Café</div>
            <div className="text-white/30 text-[0.6rem] tracking-[3px] uppercase mt-0.5">
              QR Generator
            </div>
          </div>
          <a href="/admin" className="text-white/60 hover:text-white text-sm transition-colors">
            ← Admin
          </a>
        </div>
      </header>

      {/* Controls */}
      <div className="max-w-5xl mx-auto px-4 py-5 print:hidden">
        <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1.5">
              Jumlah Meja (1 – 30)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={tableCount}
              onChange={(e) =>
                setTableCount(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))
              }
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 w-28 text-sm focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>
          <button
            onClick={() => generate(tableCount)}
            disabled={generating}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
          >
            {generating ? 'Generating...' : 'Generate'}
          </button>
          <button
            onClick={() => window.print()}
            disabled={qrDataUrls.length === 0}
            className="bg-forest hover:bg-forest-mid disabled:opacity-40 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
          >
            🖨 Cetak Semua
          </button>
          <p className="text-xs text-gray-400 self-center">
            {qrDataUrls.length > 0 && `${qrDataUrls.length} QR code siap cetak`}
          </p>
        </div>
      </div>

      {/* QR Grid */}
      <div className="max-w-5xl mx-auto px-4 pb-10">
        {generating ? (
          <div className="text-center text-gray-400 text-sm pt-10">Generating QR codes...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-4 print:gap-3">
            {qrDataUrls.map((url, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm text-center print:rounded-xl print:shadow-none print:border print:border-gray-200 print:break-inside-avoid"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`QR Meja ${i + 1}`}
                  className="w-full aspect-square"
                />
                <div className="font-serif font-bold text-forest text-sm mt-2">
                  Meja {i + 1}
                </div>
                <div className="text-[0.65rem] text-gray-400 mt-0.5 tracking-wide">
                  Hall-U Café
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
