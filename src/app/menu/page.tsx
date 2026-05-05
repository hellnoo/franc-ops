'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { MenuItem } from '@/types'

const CATEGORIES = ['Kopi', 'Non-Kopi', 'Makanan', 'Lainnya']

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

function ItemCard({
  item, qty, onAdd, onRemove,
}: {
  item: MenuItem; qty: number; onAdd: () => void; onRemove: () => void
}) {
  return (
    <div className="bg-h-card border border-h-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-[0.92rem]">{item.name}</div>
          {item.description && (
            <div className="text-h-muted text-xs mt-0.5 leading-relaxed line-clamp-2">
              {item.description}
            </div>
          )}
          <div className="text-h-red font-bold mt-2 text-[0.9rem]">{formatRp(item.price)}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          {qty > 0 && (
            <>
              <button
                onClick={onRemove}
                className="w-8 h-8 rounded-full border border-h-border flex items-center justify-center text-white font-bold text-lg leading-none hover:border-white/40 transition-colors"
              >−</button>
              <span className="w-5 text-center font-bold text-white text-sm">{qty}</span>
            </>
          )}
          <button
            onClick={onAdd}
            className="w-8 h-8 rounded-full bg-h-red hover:bg-h-red-d flex items-center justify-center text-white font-bold text-lg leading-none transition-colors"
          >+</button>
        </div>
      </div>
    </div>
  )
}

function MenuContent() {
  const params = useSearchParams()
  const tableNum = params.get('table') || '1'
  const tableName = params.get('name') || `Meja ${tableNum}`

  const [items, setItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.from('menu_items').select('*').eq('available', true).order('name')
      .then(({ data }) => { if (data) setItems(data); setLoading(false) })
  }, [])

  const addItem = (id: string) => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const removeItem = (id: string) => setCart(c => {
    const next = (c[id] || 0) - 1
    if (next <= 0) { const { [id]: _, ...rest } = c; return rest } // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...c, [id]: next }
  })

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)
  const totalPrice = items.filter(i => cart[i.id]).reduce((s, i) => s + i.price * cart[i.id], 0)

  const grouped = CATEGORIES.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    const catItems = items.filter(i => i.category === cat)
    if (catItems.length) acc[cat] = catItems
    return acc
  }, {})

  const handleSubmit = async () => {
    setSubmitting(true)
    const orderItems = items.filter(i => cart[i.id]).map(i => ({ id: i.id, name: i.name, price: i.price, qty: cart[i.id] }))
    await supabase.from('orders').insert({ table_number: parseInt(tableNum), items: orderItems, note: note.trim() || null })
    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-h-bg flex flex-col items-center justify-center text-center px-8">
        <div className="w-20 h-20 rounded-full border-2 border-h-red flex items-center justify-center mb-5">
          <svg className="w-10 h-10 text-h-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-sans text-2xl font-black text-white uppercase tracking-wider mb-1">Pesanan Diterima!</h1>
        <p className="text-h-red text-sm font-semibold">{tableName}</p>
        <p className="text-h-muted text-xs mt-3 max-w-xs leading-relaxed">Pesananmu sedang diproses. Silakan tunggu sebentar ya!</p>
        <div className="mt-5 bg-h-card border border-h-border rounded-2xl px-5 py-4 max-w-xs text-left">
          <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">Cara Bayar</div>
          <p className="text-h-muted text-xs leading-relaxed">Konfirmasi pembayaran langsung ke kasir saat pesananmu tiba — bisa tunai atau QRIS.</p>
        </div>
        <button
          onClick={() => { setCart({}); setNote(''); setSubmitted(false) }}
          className="mt-8 bg-h-red hover:bg-h-red-d text-white px-7 py-3 rounded-full font-semibold transition-colors text-sm"
        >Pesan Lagi</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-h-bg">
      <header className="bg-h-dark border-b border-h-border sticky top-0 z-40">
        <div className="max-w-[480px] mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <div className="font-sans text-lg font-black text-white tracking-widest uppercase leading-none">HALL-U</div>
            <div className="text-h-red text-[0.5rem] tracking-[3px] uppercase font-semibold mt-0.5">Coffee &amp; Sociality</div>
          </div>
          <div className="border border-h-red text-h-red rounded px-3 py-1 text-xs font-bold tracking-wider uppercase">
            {tableName}
          </div>
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-4 pt-5 pb-32">
        {loading ? (
          <div className="flex items-center justify-center pt-20 text-h-muted text-sm">Memuat menu...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center pt-20 text-h-muted text-sm">Menu belum tersedia</div>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <section key={cat} className="mb-7">
              <h2 className="text-sm font-bold text-white mb-3 px-1 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-1 h-4 bg-h-red rounded-full inline-block" />
                {cat}
              </h2>
              <div className="space-y-3">
                {catItems.map(item => (
                  <ItemCard key={item.id} item={item} qty={cart[item.id] || 0}
                    onAdd={() => addItem(item.id)} onRemove={() => removeItem(item.id)} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-[480px] mx-auto px-4 py-3 bg-h-dark border-t border-h-border">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-h-red hover:bg-h-red-d text-white rounded-xl py-3.5 flex items-center justify-between px-5 transition-colors"
            >
              <div className="bg-black/30 rounded px-2 py-0.5 text-xs font-bold">{totalItems}</div>
              <span className="font-bold text-sm uppercase tracking-wide">Lihat Pesanan</span>
              <span className="font-bold text-sm">{formatRp(totalPrice)}</span>
            </button>
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-[480px] bg-h-dark border-t border-h-border rounded-t-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-h-border rounded-full" />
            </div>
            <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-h-border">
              <h2 className="font-sans text-base font-black text-white uppercase tracking-wider">Pesanan Kamu</h2>
              <button onClick={() => setShowCart(false)} className="text-h-muted hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {items.filter(i => cart[i.id]).map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white truncate">{item.name}</div>
                    <div className="text-h-red text-xs mt-0.5">{formatRp(item.price * cart[item.id])}</div>
                  </div>
                  <div className="flex items-center gap-2.5 ml-4">
                    <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-full border border-h-border flex items-center justify-center text-white font-bold">−</button>
                    <span className="w-4 text-center font-bold text-sm text-white">{cart[item.id]}</span>
                    <button onClick={() => addItem(item.id)} className="w-7 h-7 rounded-full bg-h-red flex items-center justify-center text-white font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pt-3 pb-2 border-t border-h-border">
              <label className="text-xs text-h-muted block mb-1.5">Catatan (opsional)</label>
              <textarea
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="Contoh: tanpa es, gula sedikit..."
                className="w-full bg-h-card border border-h-border rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:border-h-red transition-colors text-white placeholder-h-muted"
                rows={2}
              />
            </div>
            <div className="px-5 pt-2 pb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-h-muted text-sm">Total</span>
                <span className="text-xl font-black text-white">{formatRp(totalPrice)}</span>
              </div>
              <button
                onClick={handleSubmit} disabled={submitting}
                className="w-full bg-h-red hover:bg-h-red-d disabled:opacity-60 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-colors"
              >{submitting ? 'Mengirim...' : 'Pesan Sekarang'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-h-bg flex items-center justify-center text-h-muted text-sm">Memuat menu...</div>}>
      <MenuContent />
    </Suspense>
  )
}
