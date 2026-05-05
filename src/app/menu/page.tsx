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
  item,
  qty,
  onAdd,
  onRemove,
}: {
  item: MenuItem
  qty: number
  onAdd: () => void
  onRemove: () => void
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-[0.92rem]">{item.name}</div>
          {item.description && (
            <div className="text-gray-400 text-xs mt-0.5 leading-relaxed line-clamp-2">
              {item.description}
            </div>
          )}
          <div className="text-emerald-600 font-bold mt-2 text-[0.9rem]">{formatRp(item.price)}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          {qty > 0 && (
            <>
              <button
                onClick={onRemove}
                className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg leading-none"
              >
                −
              </button>
              <span className="w-5 text-center font-bold text-gray-900 text-sm">{qty}</span>
            </>
          )}
          <button
            onClick={onAdd}
            className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg leading-none"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

function MenuContent() {
  const params = useSearchParams()
  const tableNum = params.get('table') || '1'

  const [items, setItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('*')
      .eq('available', true)
      .order('name')
      .then(({ data }) => {
        if (data) setItems(data)
        setLoading(false)
      })
  }, [])

  const addItem = (id: string) =>
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))

  const removeItem = (id: string) =>
    setCart((c) => {
      const next = (c[id] || 0) - 1
      if (next <= 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _, ...rest } = c
        return rest
      }
      return { ...c, [id]: next }
    })

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)
  const totalPrice = items
    .filter((i) => cart[i.id])
    .reduce((sum, i) => sum + i.price * cart[i.id], 0)

  const grouped = CATEGORIES.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    const catItems = items.filter((i) => i.category === cat)
    if (catItems.length) acc[cat] = catItems
    return acc
  }, {})

  const handleSubmit = async () => {
    setSubmitting(true)
    const orderItems = items
      .filter((i) => cart[i.id])
      .map((i) => ({ id: i.id, name: i.name, price: i.price, qty: cart[i.id] }))
    await supabase.from('orders').insert({
      table_number: parseInt(tableNum),
      items: orderItems,
      note: note.trim() || null,
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center text-center px-8">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
          <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-black text-forest mb-1">Pesanan Diterima!</h1>
        <p className="text-gray-500 text-sm">Meja {tableNum}</p>
        <p className="text-gray-400 text-xs mt-3 max-w-xs leading-relaxed">
          Pesananmu sedang diproses. Silakan tunggu sebentar ya!
        </p>
        <button
          onClick={() => { setCart({}); setNote(''); setSubmitted(false) }}
          className="mt-8 bg-emerald-500 hover:bg-emerald-600 text-white px-7 py-3 rounded-full font-semibold transition-colors text-sm"
        >
          Pesan Lagi
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-forest sticky top-0 z-40 shadow-md">
        <div className="max-w-[480px] mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <div className="font-serif text-[1.35rem] font-black text-emerald-400 leading-none">Hall-U</div>
            <div className="text-white/30 text-[0.6rem] tracking-[3px] uppercase mt-0.5">Café</div>
          </div>
          <div className="bg-emerald-600/80 rounded-full px-3.5 py-1.5 text-white text-xs font-semibold tracking-wide">
            Meja {tableNum}
          </div>
        </div>
      </header>

      {/* Menu */}
      <main className="max-w-[480px] mx-auto px-4 pt-5 pb-32">
        {loading ? (
          <div className="flex items-center justify-center pt-20 text-gray-400 text-sm">
            Memuat menu...
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center pt-20 text-gray-400 text-sm">Menu belum tersedia</div>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <section key={cat} className="mb-7">
              <h2 className="font-serif text-base font-bold text-forest mb-3 px-1 flex items-center gap-2">
                <span className="w-1 h-4 bg-emerald-500 rounded-full inline-block" />
                {cat}
              </h2>
              <div className="space-y-3">
                {catItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    qty={cart[item.id] || 0}
                    onAdd={() => addItem(item.id)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Sticky bottom bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-[480px] mx-auto px-4 py-3 bg-white border-t border-gray-200 shadow-xl">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-forest hover:bg-forest-mid text-white rounded-2xl py-3.5 flex items-center justify-between px-5 transition-colors"
            >
              <div className="bg-white/20 rounded-full px-2.5 py-0.5 text-xs font-bold">
                {totalItems}
              </div>
              <span className="font-semibold text-sm">Lihat Pesanan</span>
              <span className="font-bold text-sm">{formatRp(totalPrice)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Sheet handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-gray-100">
              <h2 className="font-serif text-lg font-bold text-forest">Pesanan Kamu</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-300 hover:text-gray-500 text-2xl leading-none w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {items.filter((i) => cart[i.id]).map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-800 truncate">{item.name}</div>
                    <div className="text-emerald-600 text-xs mt-0.5">
                      {formatRp(item.price * cart[item.id])}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 ml-4">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-7 h-7 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 font-bold"
                    >
                      −
                    </button>
                    <span className="w-4 text-center font-bold text-sm">{cart[item.id]}</span>
                    <button
                      onClick={() => addItem(item.id)}
                      className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 pt-3 pb-2 border-t border-gray-100">
              <label className="text-xs text-gray-400 block mb-1.5">
                Catatan (opsional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: tanpa es, gula sedikit, tidak pedas..."
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:border-emerald-400 transition-colors"
                rows={2}
              />
            </div>

            <div className="px-5 pt-2 pb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500 text-sm">Total</span>
                <span className="text-xl font-black text-forest">{formatRp(totalPrice)}</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white py-4 rounded-2xl font-bold text-base transition-colors"
              >
                {submitting ? 'Mengirim pesanan...' : 'Pesan Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream flex items-center justify-center text-gray-400 text-sm">
          Memuat menu...
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  )
}
