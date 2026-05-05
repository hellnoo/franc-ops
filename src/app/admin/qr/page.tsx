'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

function PencilIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4 1 1-4L16.862 3.487z" />
    </svg>
  )
}

export default function QRPage() {
  const [tableCount, setTableCount] = useState(10)
  const [labels, setLabels] = useState<string[]>(() => Array.from({ length: 10 }, (_, i) => `Meja ${i + 1}`))
  const [qrDataUrls, setQrDataUrls] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const base = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin)
    : (process.env.NEXT_PUBLIC_BASE_URL || '')

  const generate = async (count: number, currentLabels: string[]) => {
    setGenerating(true)
    const urls: string[] = []
    for (let i = 0; i < count; i++) {
      const label = currentLabels[i] || `Meja ${i + 1}`
      const url = `${base}/menu?table=${i + 1}&name=${encodeURIComponent(label)}`
      const dataUrl = await QRCode.toDataURL(url, {
        width: 240, margin: 1,
        color: { dark: '#0a0a0a', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
      urls.push(dataUrl)
    }
    setQrDataUrls(urls)
    setGenerating(false)
  }

  useEffect(() => { generate(10, labels) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCountChange = (n: number) => {
    setTableCount(n)
    setLabels(prev => {
      const next = Array.from({ length: n }, (_, i) => prev[i] || `Meja ${i + 1}`)
      return next
    })
  }

  const updateLabel = (i: number, val: string) => {
    setLabels(prev => { const n = [...prev]; n[i] = val; return n })
  }

  const startEdit = (i: number) => {
    setEditingIdx(i)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const finishEdit = () => setEditingIdx(null)

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

      {/* Controls */}
      <div className="max-w-5xl mx-auto px-4 py-5 print:hidden">
        <div className="bg-h-card border border-h-border rounded-2xl p-5 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-h-muted font-bold uppercase tracking-wide block mb-1.5">Jumlah Meja (1–30)</label>
            <input
              type="number" min={1} max={30} value={tableCount}
              onChange={e => handleCountChange(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
              className="bg-h-dark border border-h-border rounded-xl px-3.5 py-2.5 w-28 text-sm focus:outline-none focus:border-h-red text-white transition-colors"
            />
          </div>
          <button
            onClick={() => generate(tableCount, labels)} disabled={generating}
            className="bg-h-red hover:bg-h-red-d disabled:opacity-60 text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors"
          >{generating ? 'Generating...' : 'Generate QR'}</button>
          <button
            onClick={() => window.print()} disabled={qrDataUrls.length === 0}
            className="border border-h-border hover:border-white/30 text-h-muted hover:text-white disabled:opacity-40 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
          >🖨 Cetak Semua</button>
          <p className="text-xs text-h-muted self-center">
            {qrDataUrls.length > 0 && `Klik nama meja untuk edit label`}
          </p>
        </div>
      </div>

      {/* QR Grid */}
      <div className="max-w-5xl mx-auto px-4 pb-10">
        {generating ? (
          <div className="text-center text-h-muted text-sm pt-10">Generating QR codes...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-4 print:gap-4">
            {qrDataUrls.map((url, i) => (
              <div
                key={i}
                className="bg-h-card border border-h-border rounded-2xl overflow-hidden print:rounded-xl print:border print:border-gray-300 print:break-inside-avoid print:bg-white"
              >
                {/* Card header */}
                <div className="bg-h-bg print:bg-black px-3 pt-3 pb-1 text-center">
                  <div className="font-sans font-black text-white text-xs tracking-[4px] uppercase">HALL-U</div>
                  <div className="text-h-red text-[7px] tracking-[2px] uppercase font-semibold mt-0.5">Coffee &amp; Sociality</div>
                </div>

                {/* Scan here label */}
                <div className="bg-h-red print:bg-red-600 px-2 py-1 text-center">
                  <span className="text-white text-[9px] font-black uppercase tracking-[3px]">↓ Scan Here ↓</span>
                </div>

                {/* QR Code */}
                <div className="bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`QR ${labels[i] || `Meja ${i + 1}`}`} className="w-full aspect-square" />
                </div>

                {/* Editable table name */}
                <div className="px-3 py-2.5 text-center print:hidden">
                  {editingIdx === i ? (
                    <input
                      ref={inputRef}
                      value={labels[i] || ''}
                      onChange={e => updateLabel(i, e.target.value)}
                      onBlur={finishEdit}
                      onKeyDown={e => e.key === 'Enter' && finishEdit()}
                      className="w-full bg-h-dark border border-h-red rounded-lg px-2 py-1 text-center text-white text-xs font-black uppercase tracking-wider focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(i)}
                      className="group flex items-center justify-center gap-1.5 w-full hover:text-h-red transition-colors"
                    >
                      <span className="text-white font-black text-xs uppercase tracking-wider group-hover:text-h-red">
                        {labels[i] || `Meja ${i + 1}`}
                      </span>
                      <span className="text-h-muted group-hover:text-h-red opacity-0 group-hover:opacity-100 transition-all">
                        <PencilIcon />
                      </span>
                    </button>
                  )}
                </div>

                {/* Print-only label */}
                <div className="hidden print:block px-3 pb-3 text-center">
                  <div className="font-black text-black text-sm uppercase tracking-wider">{labels[i] || `Meja ${i + 1}`}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
