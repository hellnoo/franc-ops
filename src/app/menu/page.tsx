'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { subscribePush, sendPush } from '@/lib/push'
import type { MenuItem } from '@/types'

const CATEGORIES = ['Kopi', 'Non-Kopi', 'Makanan', 'Lainnya']

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

const CAT_ICONS: Record<string, string> = {
  'Kopi': '☕', 'Non-Kopi': '🥤', 'Makanan': '🍽️', 'Lainnya': '✨',
}

function generatePlaceholder(item: MenuItem): string {
  const icon = CAT_ICONS[item.category] || '☕'
  const name = item.name.length > 18 ? item.name.slice(0, 17) + '…' : item.name
  // escape karakter XML agar SVG valid
  const safeName = name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7C1515"/>
        <stop offset="100%" stop-color="#2D0808"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="45%" r="45%">
        <stop offset="0%" stop-color="#A02020" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
    </defs>
    <rect width="400" height="200" fill="url(#g)"/>
    <rect width="400" height="200" fill="url(#glow)"/>
    <text x="200" y="92" text-anchor="middle" font-size="54" opacity="0.9">${icon}</text>
    <text x="200" y="138" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17" font-weight="700" fill="rgba(255,255,255,0.88)">${safeName}</text>
    <text x="200" y="178" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="rgba(212,184,150,0.45)" letter-spacing="5">HALL-U</text>
  </svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

const IMG_ANIMATIONS = [
  'animate-kenburns',
  'animate-float-zoom',
  'animate-drift',
  'animate-tilt3d',
]
// Hash-based: konsisten per item, tidak berubah tiap render
function pickAnim(id: string) {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return IMG_ANIMATIONS[hash % IMG_ANIMATIONS.length]
}
// Stagger delay light leak biar tidak semua item leak bareng
function leakDelay(id: string) {
  return -((id.charCodeAt(0) % 10) * 1.1)
}

function ItemCard({
  item, qty, onAdd, onRemove, index = 0,
}: {
  item: MenuItem; qty: number; onAdd: () => void; onRemove: () => void; index?: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [visible, setVisible] = useState(false)
  const imgSrc = item.image_url || generatePlaceholder(item)

  // Entrance cascade — fade + slide up saat masuk viewport
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.06 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Scroll parallax — geser object-position, tidak ganggu CSS transform animation
  useEffect(() => {
    const el = cardRef.current
    const img = imgRef.current
    if (!el || !img) return
    const onScroll = () => {
      const rect = el.getBoundingClientRect()
      const progress = (window.innerHeight / 2 - rect.top - rect.height / 2) / (window.innerHeight + rect.height)
      img.style.objectPosition = `center ${50 + progress * 18}%`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      ref={cardRef}
      className="bg-h-card border border-h-border rounded-2xl overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(22px)',
        transition: `opacity 0.5s ease ${index * 65}ms, transform 0.5s ease ${index * 65}ms`,
      }}
    >
      <div
        className="relative h-40 overflow-hidden shine-overlay light-leak"
        style={{ '--leak-delay': `${leakDelay(item.id)}s` } as React.CSSProperties}
      >
        <img
          ref={imgRef}
          src={imgSrc}
          alt={item.name}
          className={`w-full h-full object-cover ${pickAnim(item.id)}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-h-card via-h-card/10 to-transparent" />
        <div className="absolute bottom-2.5 right-3 bg-black/60 backdrop-blur-sm text-h-red font-black text-sm px-2.5 py-1 rounded-lg">
          {formatRp(item.price)}
        </div>
      </div>
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-[0.92rem]">{item.name}</div>
          {item.description && (
            <div className="text-h-muted text-xs mt-0.5 leading-relaxed line-clamp-2">
              {item.description}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          {qty > 0 && (
            <>
              <button
                onClick={onRemove}
                className="w-8 h-8 rounded-full border border-h-border flex items-center justify-center text-white font-bold text-lg leading-none hover:border-white/40 transition-colors active:scale-90"
              >−</button>
              <span className="w-5 text-center font-bold text-white text-sm">{qty}</span>
            </>
          )}
          <button
            onClick={onAdd}
            className="w-8 h-8 rounded-full bg-h-red hover:bg-h-red-d flex items-center justify-center text-white font-bold text-lg leading-none transition-all active:scale-90"
          >+</button>
        </div>
      </div>
    </div>
  )
}

// ── Order persistence helpers ──────────────────────────────
const ORDER_KEY = (table: string) => `hallu-order-${table}`
const ORDER_EXPIRY = 3 * 60 * 60 * 1000 // 3 jam

function saveActiveOrder(table: string, id: string) {
  localStorage.setItem(ORDER_KEY(table), JSON.stringify({ id, createdAt: Date.now() }))
}
function clearActiveOrder(table: string) {
  localStorage.removeItem(ORDER_KEY(table))
}
function getActiveOrderId(table: string): string | null {
  try {
    const raw = localStorage.getItem(ORDER_KEY(table))
    if (!raw) return null
    const { id, createdAt } = JSON.parse(raw)
    if (Date.now() - createdAt > ORDER_EXPIRY) { clearActiveOrder(table); return null }
    return id
  } catch { return null }
}

function MenuContent() {
  const params = useSearchParams()
  const tableNum = params.get('table') || '1'
  const tableName = params.get('name') || `Meja ${tableNum}`

  const [items, setItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [payMethod, setPayMethod] = useState<'tunai' | 'qris' | ''>('')
  const [note, setNote] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderStatus, setOrderStatus] = useState<string>('new')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [restoring, setRestoring] = useState(true) // true saat cek localStorage
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // ── Restore active order saat mount / refresh ──────────────
  useEffect(() => {
    const savedId = getActiveOrderId(tableNum)
    if (!savedId) { setRestoring(false); return }

    // Fetch status terkini dari DB (bukan cuma trust localStorage)
    supabase.from('orders').select('status').eq('id', savedId).single()
      .then(({ data }) => {
        if (!data || data.status === 'done' || data.status === 'cancelled') {
          clearActiveOrder(tableNum)
        } else {
          setOrderId(savedId)
          setOrderStatus(data.status)
          setSubmitted(true)
        }
        setRestoring(false)
      })
  }, [tableNum]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cart persistence — simpan & load dari localStorage per meja
  useEffect(() => {
    const saved = localStorage.getItem(`hallu-cart-${tableNum}`)
    if (saved) try { setCart(JSON.parse(saved)) } catch { /* ignore */ }
  }, [tableNum])
  useEffect(() => {
    if (Object.keys(cart).length > 0) localStorage.setItem(`hallu-cart-${tableNum}`, JSON.stringify(cart))
    else localStorage.removeItem(`hallu-cart-${tableNum}`)
  }, [cart, tableNum])

  useEffect(() => {
    supabase.from('menu_items').select('*').eq('available', true).order('name')
      .then(({ data }) => { if (data) setItems(data); setLoading(false) })
  }, [])

  // IntersectionObserver — update active tab saat scroll
  useEffect(() => {
    if (loading) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveCategory(e.target.getAttribute('data-cat') || '') })
    }, { rootMargin: '-15% 0px -75% 0px' })
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [loading])

  const addItem = (id: string) => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const removeItem = (id: string) => setCart(c => {
    const next = (c[id] || 0) - 1
    if (next <= 0) { const { [id]: _, ...rest } = c; return rest } // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...c, [id]: next }
  })

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)
  const totalPrice = items.filter(i => cart[i.id]).reduce((s, i) => s + i.price * cart[i.id], 0)

  const scrollToCategory = (cat: string) => {
    setActiveCategory(cat)
    sectionRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const grouped = CATEGORIES.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    const catItems = items.filter(i => i.category === cat)
    if (catItems.length) acc[cat] = catItems
    return acc
  }, {})

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const orderItems = items.filter(i => cart[i.id]).map(i => ({ id: i.id, name: i.name, price: i.price, qty: cart[i.id] }))
      const { data, error } = await supabase.from('orders').insert({ table_number: parseInt(tableNum), items: orderItems, note: note.trim() || null, customer_name: customerName.trim() || null, phone: phone.trim() || null, payment_method: payMethod || null }).select('id').single()
      if (error) throw error
      setOrderId(data.id)
      setOrderStatus('new')
      setSubmitted(true)
      saveActiveOrder(tableNum, data.id) // ← persist biar tidak hilang kalau refresh
      // Notif ke kasir (walau page kasir tutup)
      sendPush('kasir', {
        title: '🔔 Order Baru!',
        body: `${tableName}${customerName ? ` — ${customerName}` : ''}`,
        url: '/kasir',
        tag: 'new-order'
      })
      // Subscribe customer untuk notif pesanan siap
      subscribePush('customer', data.id)
    } catch {
      setSubmitError('Gagal mengirim pesanan. Periksa koneksi lalu coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  // Realtime: listen for status changes on submitted order
  useEffect(() => {
    if (!orderId) return
    const ch = supabase.channel(`order-status-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, payload => {
        const newStatus = payload.new.status
        setOrderStatus(newStatus)
        // Bersihkan localStorage kalau order sudah selesai / dibatalkan
        if (newStatus === 'done' || newStatus === 'cancelled') {
          clearActiveOrder(tableNum)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [orderId, tableNum])

  // Saat restore order dari localStorage — jangan tampilkan menu dulu
  if (restoring) return (
    <div className="min-h-screen bg-h-bg flex items-center justify-center">
      <div className="text-center">
        <div className="font-sans font-black text-white tracking-widest text-xl uppercase mb-2">HALL-U</div>
        <div className="text-h-muted text-xs animate-pulse">Memuat...</div>
      </div>
    </div>
  )

  if (submitted) {
    const isPreparing = orderStatus === 'preparing'
    const isReady = orderStatus === 'ready'
    const isDone = orderStatus === 'done'
    const isCancelled = orderStatus === 'cancelled'

    return (
      <div className="min-h-screen bg-h-bg flex flex-col items-center justify-center text-center px-8">
        {isCancelled ? (
          <>
            <div className="w-20 h-20 rounded-full border-2 border-h-border flex items-center justify-center mb-5">
              <span className="text-4xl">✕</span>
            </div>
            <h1 className="font-sans text-2xl font-black text-white uppercase tracking-wider mb-1">Dibatalkan</h1>
            <p className="text-h-muted text-xs mt-3 max-w-xs">Pesananmu dibatalkan oleh kasir. Silakan order ulang atau tanya langsung ke kasir.</p>
          </>
        ) : isReady ? (
          <>
            <div className="w-24 h-24 rounded-full bg-h-red/10 border-2 border-h-red flex items-center justify-center mb-5 animate-pulse">
              <span className="text-5xl">🔔</span>
            </div>
            <h1 className="font-sans text-2xl font-black text-white uppercase tracking-wider mb-1">Pesanan Siap!</h1>
            <p className="text-h-red text-sm font-bold">{tableName}</p>
            <p className="text-white/70 text-sm mt-3 max-w-xs leading-relaxed">Silakan ke kasir untuk ambil pesananmu dan konfirmasi pembayaran.</p>
          </>
        ) : isDone ? (
          <>
            <div className="w-20 h-20 rounded-full border-2 border-h-red flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-h-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-sans text-2xl font-black text-white uppercase tracking-wider mb-1">Selesai!</h1>
            <p className="text-h-muted text-xs mt-3 max-w-xs">Terima kasih sudah mampir ke Hall-U ☕</p>
          </>
        ) : isPreparing ? (
          <>
            <div className="w-20 h-20 rounded-full border-2 border-yellow-500 flex items-center justify-center mb-5">
              <span className="text-4xl">👨‍🍳</span>
            </div>
            <h1 className="font-sans text-2xl font-black text-white uppercase tracking-wider mb-1">Sedang Disiapkan</h1>
            <p className="text-yellow-400 text-sm font-semibold">{tableName}</p>
            <p className="text-h-muted text-xs mt-3 max-w-xs leading-relaxed">Pesananmu sedang dibuat oleh barista kami. Sebentar lagi siap! ☕</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full border-2 border-h-border flex items-center justify-center mb-5">
              <span className="text-4xl animate-spin" style={{ animationDuration: '3s' }}>⏳</span>
            </div>
            <h1 className="font-sans text-2xl font-black text-white uppercase tracking-wider mb-1">Pesanan Diterima!</h1>
            <p className="text-h-red text-sm font-semibold">{tableName}</p>
            <p className="text-h-muted text-xs mt-3 max-w-xs leading-relaxed">Pesananmu sedang diproses. Halaman ini otomatis update saat pesanan siap — tetap buka ya!</p>
          </>
        )}

        {/* Steps indicator */}
        <div className="mt-8 flex items-center gap-2 max-w-xs w-full justify-center">
          {[['Diterima', true], ['Disiapkan', isPreparing || isReady || isDone], ['Siap Diambil', isReady || isDone]].map(([label, done], i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-colors ${done ? 'bg-h-red text-white' : 'bg-h-border text-h-muted'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className="text-[9px] text-h-muted whitespace-nowrap">{label as string}</span>
              </div>
              {i < arr.length - 1 && <div className={`w-8 h-px mb-4 transition-colors ${done ? 'bg-h-red' : 'bg-h-border'}`} />}
            </div>
          ))}
        </div>

        {(isCancelled || isDone) && (
          <button
            onClick={() => { setCart({}); setNote(''); setCustomerName(''); setPhone(''); setPayMethod(''); setSubmitted(false); setOrderId(null); clearActiveOrder(tableNum); localStorage.removeItem(`hallu-cart-${tableNum}`) }}
            className="mt-8 bg-h-red hover:bg-h-red-d text-white px-7 py-3 rounded-full font-semibold transition-colors text-sm"
          >Pesan Lagi</button>
        )}
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
        {/* Sticky category tabs */}
        {!loading && Object.keys(grouped).length > 0 && (
          <div className="max-w-[480px] mx-auto flex overflow-x-auto scrollbar-hide border-t border-h-border/50 px-2">
            {Object.keys(grouped).map(cat => (
              <button key={cat} onClick={() => scrollToCategory(cat)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeCategory === cat ? 'text-h-red border-h-red' : 'text-h-muted border-transparent hover:text-white'}`}>
                <span>{CAT_ICONS[cat]}</span>{cat}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-[480px] mx-auto px-4 pt-5 pb-32">
        {loading ? (
          <div className="flex items-center justify-center pt-20 text-h-muted text-sm">Memuat menu...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center pt-20 text-h-muted text-sm">Menu belum tersedia</div>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <section key={cat} className="mb-7" data-cat={cat}
              ref={el => { sectionRefs.current[cat] = el }}>
              <h2 className="text-sm font-bold text-white mb-3 px-1 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-1 h-4 bg-h-red rounded-full inline-block" />
                {CAT_ICONS[cat]} {cat}
              </h2>
              <div className="space-y-3">
                {catItems.map((item, i) => (
                  <ItemCard key={item.id} item={item} qty={cart[item.id] || 0} index={i}
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
              <label className="text-xs text-h-muted block mb-1.5">Nama Pemesan <span className="text-h-red">*</span></label>
              <input
                value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="Contoh: Andi"
                className="w-full bg-h-card border border-h-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-h-red transition-colors text-white placeholder-h-muted mb-3"
              />
              <label className="text-xs text-h-muted block mb-1.5">No. WhatsApp <span className="text-h-muted">(opsional · untuk notifikasi)</span></label>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full bg-h-card border border-h-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-h-red transition-colors text-white placeholder-h-muted mb-3"
              />
              <label className="text-xs text-h-muted block mb-1.5">Metode Bayar <span className="text-h-red">*</span></label>
              <div className="flex gap-2 mb-3">
                {([['tunai', '💵 Tunai'], ['qris', '⬛ QRIS']] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setPayMethod(val)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border ${payMethod === val ? 'bg-h-red border-h-red text-white' : 'bg-h-card border-h-border text-h-muted hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
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
              {submitError && <p className="text-h-red text-xs mb-3 text-center">{submitError}</p>}
              <button
                onClick={handleSubmit} disabled={submitting || !customerName.trim() || !payMethod}
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
