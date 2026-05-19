'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { MenuItem, Order, OrderItem } from '@/types'
import { subscribePush, sendPush } from '@/lib/push'

const OWNER_WA = '6281245400031'

function formatRp(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }
function formatTime(s: string) { return new Date(s).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }
function orderTotal(items: OrderItem[]) { return items.reduce((s, i) => s + i.price * i.qty, 0) }

function buildDailyReport(orders: Order[], date: string): string {
  const d = new Date(date)
  const tanggal = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const revenue = orders.reduce((s, o) => s + orderTotal(o.items), 0)
  const avgOrder = orders.length ? Math.round(revenue / orders.length) : 0

  const byMethod: Record<string, { total: number; count: number }> = {}
  orders.forEach(o => {
    const m = o.payment_method || 'lainnya'
    if (!byMethod[m]) byMethod[m] = { total: 0, count: 0 }
    byMethod[m].total += orderTotal(o.items)
    byMethod[m].count++
  })

  const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {}
  orders.forEach(o => o.items.forEach(i => {
    if (!itemMap[i.name]) itemMap[i.name] = { name: i.name, qty: 0, revenue: 0 }
    itemMap[i.name].qty += i.qty
    itemMap[i.name].revenue += i.price * i.qty
  }))
  const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5)

  const ratedOrders = orders.filter(o => o.rating)
  const avgRating = ratedOrders.length
    ? (ratedOrders.reduce((s, o) => s + (o.rating || 0), 0) / ratedOrders.length).toFixed(1)
    : null

  const methodLabels: Record<string, string> = { tunai: '💵 Tunai', qris: '⬛ QRIS', transfer: '🏦 Transfer', lainnya: '💳 Lainnya' }

  const lines = [
    `📊 *LAPORAN HARIAN HALL-U*`,
    `📅 ${tanggal}`,
    ``,
    `💰 *Total Pendapatan: ${formatRp(revenue)}*`,
    `🧾 Total Transaksi: ${orders.length} order`,
    orders.length ? `📈 Rata-rata/order: ${formatRp(avgOrder)}` : '',
    ``,
    `💳 *Per Metode Bayar:*`,
    ...Object.entries(byMethod).map(([m, v]) => `${methodLabels[m] || m}: ${formatRp(v.total)} (${v.count} order)`),
    ``,
    topItems.length ? `🏆 *Top Item:*` : '',
    ...topItems.map((item, i) => `${i + 1}. ${item.name} ×${item.qty} — ${formatRp(item.revenue)}`),
    avgRating ? `` : '',
    avgRating ? `⭐ Rata-rata Rating: ${avgRating} (dari ${ratedOrders.length} ulasan)` : '',
    ``,
    `_Laporan otomatis dari Hall-U POS_ 🚀`,
  ].filter(l => l !== undefined)

  return lines.join('\n')
}

async function requestNotifPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'default') await Notification.requestPermission()
}

function showBrowserNotif(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.svg', tag: 'hallu-order' })
  }
}

function formatPhone(phone: string) {
  const n = phone.replace(/\D/g, '')
  if (n.startsWith('62')) return n
  if (n.startsWith('0')) return '62' + n.slice(1)
  return '62' + n
}

function waLink(phone: string, msg: string) {
  return `https://wa.me/${formatPhone(phone)}?text=${encodeURIComponent(msg)}`
}

function msgSiap(order: Order) {
  const meja = order.table_number > 0 ? `Meja ${order.table_number}` : 'Walk-in'
  const bayar = order.payment_method === 'qris' ? 'QRIS' : order.payment_method === 'transfer' ? 'Transfer' : 'Tunai'
  return `Halo ${order.customer_name || 'Kak'}! 👋\n\nPesananmu di *Hall-U Coffee & Sociality* sudah siap diambil. 🔔\n\n🪑 ${meja}\n💳 Pembayaran: ${bayar}\n\nSilakan ke kasir ya! ☕`
}

function msgStruk(order: Order) {
  const meja = order.table_number > 0 ? `Meja ${order.table_number}` : 'Walk-in'
  const bayar = order.payment_method === 'qris' ? 'QRIS' : order.payment_method === 'transfer' ? 'Transfer' : 'Tunai'
  const waktu = formatTime(order.created_at)
  const lines = order.items.map(i => `  ${i.name} ×${i.qty}  ${formatRp(i.price * i.qty)}`).join('\n')
  const total = orderTotal(order.items)
  return `*STRUK HALL-U*\n_Coffee & Sociality_\n\n${meja} | a/n ${order.customer_name || '-'}\n${waktu}\n\n${lines}\n\n*Total: ${formatRp(total)}*\nMetode: ${bayar}\n\nTerima kasih sudah mampir! ☕`
}

function playNewOrderSound() {
  try {
    const ctx = new AudioContext()
    const notes = [880, 1108, 1320]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.14
      gain.gain.setValueAtTime(0.25, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      osc.start(t); osc.stop(t + 0.4)
    })
  } catch { /* blocked */ }
}

type PayMethod = 'tunai' | 'qris' | 'transfer'
const PAY_OPTS: { value: PayMethod; label: string; icon: string }[] = [
  { value: 'tunai', label: 'Tunai', icon: '💵' },
  { value: 'qris', label: 'QRIS', icon: '⬛' },
  { value: 'transfer', label: 'Transfer', icon: '🏦' },
]

function OrderCard({ order, onDone, onCancel, onReady, onPreparing }: { order: Order; onDone?: (method: PayMethod) => void; onCancel?: () => void; onReady?: () => void; onPreparing?: () => void }) {
  const [paying, setPaying] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const total = orderTotal(order.items)
  const isPreparing = order.status === 'preparing'
  const isReady = order.status === 'ready'
  const isActive = order.status === 'new' || isPreparing || isReady
  const payOpt = PAY_OPTS.find(p => p.value === order.payment_method)

  return (
    <div className={`bg-h-card rounded-2xl overflow-hidden border-l-4 ${isReady ? 'border-green-500' : isPreparing ? 'border-yellow-500' : isActive ? 'border-h-red' : 'border-h-border'}`}>
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-h-border">
        <div>
          <div className="font-sans font-black text-white text-lg uppercase tracking-wider">
            {order.table_number > 0 ? `Meja ${order.table_number}` : 'Walk-in'}
          </div>
          {order.customer_name && <div className="text-xs text-h-muted mt-0.5">a/n {order.customer_name}</div>}
        </div>
        <div className="text-right">
          <div className="text-xs text-h-muted">{formatTime(order.created_at)}</div>
          {payOpt && <div className="text-xs text-h-red font-bold mt-0.5">{payOpt.icon} {payOpt.label}</div>}
        </div>
      </div>
      <div className="px-4 py-3 space-y-1.5 border-b border-h-border">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-white/80">{item.name} <span className="text-h-muted">×{item.qty}</span></span>
            <span className="text-h-muted">{formatRp(item.price * item.qty)}</span>
          </div>
        ))}
      </div>
      {order.note && <div className="px-4 py-2 border-b border-h-border"><span className="text-xs text-yellow-400">📝 {order.note}</span></div>}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-h-muted">Total</div>
            <div className="font-black text-white">{formatRp(total)}</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isReady && onDone && !paying && (
              <span className="text-xs text-green-400 font-bold animate-pulse">● Siap diambil</span>
            )}
            {isPreparing && !isReady && !paying && (
              <span className="text-xs text-yellow-400 font-bold">⏳ Disiapkan</span>
            )}
            {onCancel && !paying && !isReady && !isPreparing && (
              confirmCancel ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-h-muted">Batalkan?</span>
                  <button onClick={onCancel} className="text-xs text-white bg-h-border hover:bg-white/20 px-2.5 py-1 rounded-lg font-bold transition-colors">Ya</button>
                  <button onClick={() => setConfirmCancel(false)} className="text-xs text-h-muted hover:text-white font-bold">Tidak</button>
                </div>
              ) : (
                <button onClick={() => setConfirmCancel(true)} className="text-xs text-h-muted hover:text-white border border-h-border hover:border-white/30 px-3 py-1.5 rounded-full transition-colors">
                  Batalkan
                </button>
              )
            )}
            {onPreparing && !isPreparing && !isReady && !paying && (
              <button onClick={onPreparing} className="bg-h-dark border border-h-border hover:border-white/40 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
                Proses →
              </button>
            )}
            {onReady && isPreparing && !isReady && !paying && (
              <button onClick={onReady} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
                Siap →
              </button>
            )}
            {isReady && onDone && !paying && (
              <button
                onClick={() => order.payment_method ? onDone(order.payment_method as PayMethod) : setPaying(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
                Selesai ✓
              </button>
            )}
            {!onDone && <span className="text-xs text-h-muted bg-h-border px-3 py-1.5 rounded-full">Selesai</span>}
            {/* WA notif siap */}
            {isReady && order.phone && (
              <a href={waLink(order.phone, msgSiap(order))} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors">
                📱 WA Siap
              </a>
            )}
            {/* WA struk */}
            {!onDone && order.phone && (
              <a href={waLink(order.phone, msgStruk(order))} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 border border-h-border hover:border-white/30 text-h-muted hover:text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors">
                📄 Struk WA
              </a>
            )}
          </div>
        </div>
        {paying && onDone && (
          <div className="mt-3">
            <div className="text-xs text-h-muted mb-2">Metode bayar:</div>
            <div className="flex gap-2">
              {PAY_OPTS.map(opt => (
                <button key={opt.value} onClick={() => onDone(opt.value)}
                  className="flex-1 bg-h-dark border border-h-border hover:border-h-red text-white py-2 rounded-xl text-xs font-bold transition-colors">
                  {opt.icon}<br />{opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const CATEGORIES = ['Kopi', 'Non-Kopi', 'Makanan', 'Lainnya']

function ManualOrderForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [table, setTable] = useState('')
  const [payMethod, setPayMethod] = useState<PayMethod | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('menu_items').select('*').eq('available', true).order('category').order('name')
      .then(({ data }) => { if (data) setMenuItems(data as MenuItem[]) })
  }, [])

  const add = (id: string) => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const remove = (id: string) => setCart(c => {
    const next = (c[id] || 0) - 1
    if (next <= 0) { const { [id]: _, ...rest } = c; return rest } // eslint-disable-line
    return { ...c, [id]: next }
  })

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)
  const totalPrice = menuItems.filter(i => cart[i.id]).reduce((s, i) => s + i.price * cart[i.id], 0)

  const handleSubmit = async () => {
    if (totalItems === 0) return setError('Pilih minimal 1 item')
    if (!name.trim()) return setError('Isi nama pemesan')
    if (!payMethod) return setError('Pilih metode bayar')
    setSubmitting(true); setError('')
    try {
      const orderItems = menuItems.filter(i => cart[i.id]).map(i => ({ id: i.id, name: i.name, price: i.price, qty: cart[i.id] }))
      const { error: err } = await supabase.from('orders').insert({
        table_number: parseInt(table) || 0,
        customer_name: name.trim(),
        items: orderItems,
        note: null,
        status: 'new',
        payment_method: payMethod,
      })
      if (err) throw err
      setCart({}); setName(''); setTable(''); setPayMethod(null)
      onSubmitted()
    } catch { setError('Gagal menyimpan order. Coba lagi.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-5 pb-10">
      {CATEGORIES.map(cat => {
        const catItems = menuItems.filter(i => i.category === cat)
        if (!catItems.length) return null
        return (
          <div key={cat}>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1 h-3.5 bg-h-red rounded-full inline-block" />{cat}
            </h3>
            <div className="bg-h-card border border-h-border rounded-2xl divide-y divide-h-border">
              {catItems.map(item => (
                <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white font-medium">{item.name}</div>
                    <div className="text-xs text-h-red font-bold">{formatRp(item.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cart[item.id] > 0 && (
                      <>
                        <button onClick={() => remove(item.id)} className="w-7 h-7 rounded-full border border-h-border flex items-center justify-center text-white font-bold text-lg leading-none">−</button>
                        <span className="w-5 text-center font-bold text-white text-sm">{cart[item.id]}</span>
                      </>
                    )}
                    <button onClick={() => add(item.id)} className="w-7 h-7 rounded-full bg-h-red hover:bg-h-red-d flex items-center justify-center text-white font-bold text-lg leading-none transition-colors">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {totalItems > 0 && (
        <div className="bg-h-card border border-h-border rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-h-border">
            <span className="text-h-muted text-sm">{totalItems} item</span>
            <span className="font-black text-white text-xl">{formatRp(totalPrice)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-h-muted block mb-1.5">Nama Pemesan *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama customer"
                className="w-full bg-h-dark border border-h-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-h-red transition-colors placeholder-h-muted" />
            </div>
            <div>
              <label className="text-xs text-h-muted block mb-1.5">No. Meja (opsional)</label>
              <input value={table} onChange={e => setTable(e.target.value)} placeholder="Misal: 5"
                className="w-full bg-h-dark border border-h-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-h-red transition-colors placeholder-h-muted" />
            </div>
          </div>
          <div>
            <label className="text-xs text-h-muted block mb-2">Metode Bayar *</label>
            <div className="flex gap-2">
              {PAY_OPTS.map(opt => (
                <button key={opt.value} onClick={() => setPayMethod(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors border ${payMethod === opt.value ? 'bg-h-red border-h-red text-white' : 'bg-h-dark border-h-border text-h-muted hover:text-white'}`}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-h-red text-xs">{error}</p>}
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-h-red hover:bg-h-red-d disabled:opacity-60 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-colors">
            {submitting ? 'Menyimpan...' : 'Proses Order'}
          </button>
        </div>
      )}
    </div>
  )
}

type Tab = 'new' | 'manual' | 'history' | 'rekap'

export default function KasirPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState(''); const [pwError, setPwError] = useState('')
  const [newOrders, setNewOrders] = useState<Order[]>([])
  const [doneOrders, setDoneOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<Tab>('new')
  const [loading, setLoading] = useState(true)
  const [rekapDate, setRekapDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isIdle, setIsIdle] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeReportOrders, setCloseReportOrders] = useState<Order[]>([])
  const [closeReportLoading, setCloseReportLoading] = useState(false)
  const initialized = useRef(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetIdle = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    setIsIdle(false)
    idleTimer.current = setTimeout(() => setIsIdle(true), 30000)
  }

  useEffect(() => {
    if (!authed) return
    const events = ['mousemove', 'click', 'keypress', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetIdle))
    resetIdle()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle))
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [authed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Jangan idle kalau ada order aktif
  useEffect(() => {
    if (newOrders.length > 0) { setIsIdle(false); resetIdle() }
  }, [newOrders]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (localStorage.getItem('hallu-kasir') === 'ok') setAuthed(true) }, [])

  const loadNew = async () => {
    const { data } = await supabase.from('orders').select('*').in('status', ['new', 'preparing', 'ready']).order('created_at', { ascending: true })
    if (data) setNewOrders(data as Order[])
    setLoading(false)
  }

  const loadDone = async (date?: string) => {
    const d = new Date(date || rekapDate); d.setHours(0, 0, 0, 0)
    const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999)
    const { data } = await supabase.from('orders').select('*').eq('status', 'done').gte('created_at', d.toISOString()).lte('created_at', dEnd.toISOString()).order('created_at', { ascending: false })
    if (data) setDoneOrders(data as Order[])
  }

  useEffect(() => {
    if (!authed) return
    loadNew().then(() => { initialized.current = true })
  }, [authed])

  useEffect(() => {
    if (!authed) return
    const ch = supabase.channel('kasir-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const order = payload.new as Order
        setNewOrders(prev => {
          if (prev.find(o => o.id === order.id)) return prev
          return [...prev, order].sort((a, b) => a.created_at.localeCompare(b.created_at))
        })
        if (initialized.current) {
          playNewOrderSound()
          const meja = order.table_number > 0 ? `Meja ${order.table_number}` : 'Walk-in'
          const nama = order.customer_name ? ` — ${order.customer_name}` : ''
          showBrowserNotif('🔔 Order Baru!', `${meja}${nama}`)
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        const updated = payload.new as Order
        if (updated.status === 'done') {
          setNewOrders(prev => prev.filter(o => o.id !== updated.id))
          setDoneOrders(prev => prev.find(o => o.id === updated.id) ? prev : [updated, ...prev])
        } else if (updated.status === 'preparing' || updated.status === 'ready') {
          setNewOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
        } else if (updated.status === 'cancelled') {
          setNewOrders(prev => prev.filter(o => o.id !== updated.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [authed])

  useEffect(() => {
    const count = newOrders.length
    document.title = count > 0 ? `(${count}) Order Baru | Hall-U Kasir` : 'Hall-U Kasir'
  }, [newOrders])

  // Fix: reload orders saat tab kembali aktif (Realtime kadang disconnect saat tab lama tidak aktif)
  useEffect(() => {
    if (!authed) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadNew()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [authed]) // eslint-disable-line react-hooks/exhaustive-deps

  const markDone = async (id: string, method: PayMethod) => {
    setNewOrders(prev => prev.filter(o => o.id !== id))
    await supabase.from('orders').update({ status: 'done', payment_method: method }).eq('id', id)
  }

  const markPreparing = async (id: string) => {
    setNewOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'preparing' } : o))
    await supabase.from('orders').update({ status: 'preparing' }).eq('id', id)
  }

  const markReady = async (id: string) => {
    const order = newOrders.find(o => o.id === id)
    setNewOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'ready' } : o))
    await supabase.from('orders').update({ status: 'ready' }).eq('id', id)
    // Push ke customer kalau ada subscription
    if (order) {
      const meja = order.table_number > 0 ? `Meja ${order.table_number}` : 'Walk-in'
      sendPush('customer', {
        title: '🔔 Pesanan Siap!',
        body: `${meja} — silakan ke kasir untuk ambil & bayar.`,
        url: '/menu',
        tag: 'order-ready'
      }, id)
    }
  }

  const cancelOrder = async (id: string) => {
    setNewOrders(prev => prev.filter(o => o.id !== id))
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id)
  }

  const openCloseModal = async () => {
    setShowCloseModal(true)
    setCloseReportLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const d = new Date(today); d.setHours(0, 0, 0, 0)
    const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999)
    const { data } = await supabase.from('orders').select('*')
      .eq('status', 'done')
      .gte('created_at', d.toISOString())
      .lte('created_at', dEnd.toISOString())
    setCloseReportOrders((data as Order[]) || [])
    setCloseReportLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/kasir-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
    if (res.ok) {
      localStorage.setItem('hallu-kasir', 'ok')
      setAuthed(true)
      subscribePush('kasir') // daftar push notification kasir
    }
    else setPwError('Password salah')
  }

  const rekap = useMemo(() => {
    const revenue = doneOrders.reduce((s, o) => s + orderTotal(o.items), 0)
    const byMethod: Record<string, number> = {}
    doneOrders.forEach(o => {
      const m = o.payment_method || 'lainnya'
      byMethod[m] = (byMethod[m] || 0) + orderTotal(o.items)
    })
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {}
    doneOrders.forEach(o => o.items.forEach(item => {
      if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, qty: 0, revenue: 0 }
      itemMap[item.name].qty += item.qty
      itemMap[item.name].revenue += item.price * item.qty
    }))
    return { revenue, byMethod, orderCount: doneOrders.length, topItems: Object.values(itemMap).sort((a, b) => b.qty - a.qty) }
  }, [doneOrders])

  if (!authed) return (
    <div className="min-h-screen bg-h-bg flex items-center justify-center p-6">
      <div className="bg-h-card border border-h-border rounded-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-sans text-2xl font-black text-white tracking-widest uppercase">HALL-U</div>
          <div className="flex items-center gap-2 justify-center mt-1">
            <div className="h-px w-6 bg-h-red" />
            <div className="text-h-red text-[0.5rem] tracking-[3px] uppercase font-semibold">Dashboard Kasir</div>
            <div className="h-px w-6 bg-h-red" />
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-h-muted font-semibold uppercase tracking-wide block mb-1.5">Password</label>
            <input type="password" value={pw} onChange={e => { setPw(e.target.value); setPwError('') }}
              className="w-full bg-h-dark border border-h-border rounded-xl px-4 py-3 focus:outline-none focus:border-h-red transition-colors text-sm text-white placeholder-h-muted"
              placeholder="Masukkan password kasir" autoFocus />
            {pwError && <p className="text-h-red text-xs mt-1">{pwError}</p>}
          </div>
          <button type="submit" className="w-full bg-h-red hover:bg-h-red-d text-white py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-colors">Masuk</button>
        </form>
      </div>
    </div>
  )

  const TABS: { key: Tab; label: string }[] = [
    { key: 'new', label: `Order Masuk${newOrders.length > 0 ? ` (${newOrders.length})` : ''}` },
    { key: 'manual', label: 'Input Manual' },
    { key: 'history', label: 'Riwayat' },
    { key: 'rekap', label: 'Rekap' },
  ]

  return (
    <div className="min-h-screen bg-h-bg" onClick={resetIdle}>
      {/* Screensaver */}
      {isIdle && (
        <div
          onClick={() => setIsIdle(false)}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer select-none"
          style={{ backgroundColor: '#7C1515' }}
        >
          <div className="text-center animate-pulse" style={{ animationDuration: '3s' }}>
            <div className="font-serif text-7xl mb-2" style={{ color: '#D4B896', fontFamily: 'var(--font-playfair)', letterSpacing: '0.05em' }}>
              هالو
            </div>
            <div className="font-sans font-black text-3xl tracking-[0.3em] uppercase mb-1" style={{ color: '#D4B896' }}>
              HALLU
            </div>
            <div className="text-xs tracking-[0.25em] uppercase" style={{ color: '#B8967A' }}>
              Coffee &amp; Sociality
            </div>
          </div>
          <div className="absolute bottom-10 text-xs tracking-widest uppercase opacity-40" style={{ color: '#D4B896' }}>
            Ketuk untuk melanjutkan
          </div>
        </div>
      )}
      <header className="bg-h-dark border-b border-h-border">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-sans text-xl font-black text-white tracking-widest uppercase">HALL-U</div>
            <div className="text-h-red text-[0.55rem] tracking-[3px] uppercase font-semibold mt-0.5">Dashboard Kasir</div>
          </div>
          <div className="flex items-center gap-3">
            {newOrders.length > 0 && (
              <span className="bg-h-red text-white text-xs font-black px-3 py-1 rounded uppercase tracking-wide animate-pulse">
                {newOrders.length} baru
              </span>
            )}
            <button onClick={openCloseModal}
              className="bg-h-red/10 hover:bg-h-red/20 border border-h-red/40 text-h-red px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
              Tutup Kasir
            </button>
            <button onClick={() => { localStorage.removeItem('hallu-kasir'); setAuthed(false) }}
              className="border border-h-border hover:border-white/30 text-h-muted hover:text-white px-4 py-1.5 rounded-full text-sm transition-colors">
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="bg-h-dark border-b border-h-border sticky top-0 z-30 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex min-w-max">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => { setTab(key); if (key === 'history' || key === 'rekap') loadDone(rekapDate) }}
              className={`px-5 py-3.5 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${tab === key ? 'text-h-red border-h-red' : 'text-h-muted border-transparent hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-5">
        {tab === 'manual' ? (
          <ManualOrderForm onSubmitted={() => setTab('new')} />
        ) : loading ? (
          <div className="text-center text-h-muted text-sm pt-16">Memuat pesanan...</div>
        ) : tab === 'new' ? (
          newOrders.length === 0 ? (
            <div className="text-center pt-20">
              <div className="text-5xl mb-4">☕</div>
              <div className="text-h-muted text-sm">Belum ada pesanan baru</div>
              <button onClick={() => setTab('manual')} className="mt-4 text-h-red text-xs font-bold hover:underline">+ Input Manual</button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {newOrders.map(order => <OrderCard key={order.id} order={order} onDone={(m) => markDone(order.id, m)} onCancel={() => cancelOrder(order.id)} onPreparing={() => markPreparing(order.id)} onReady={() => markReady(order.id)} />)}
            </div>
          )
        ) : tab === 'history' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="date" value={rekapDate} onChange={e => { setRekapDate(e.target.value); loadDone(e.target.value) }}
                className="bg-h-card border border-h-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-h-red transition-colors" />
              <span className="text-xs text-h-muted">{doneOrders.length} order</span>
            </div>
            {doneOrders.length === 0 ? (
              <div className="text-center pt-16"><div className="text-5xl mb-4">📋</div><div className="text-h-muted text-sm">Tidak ada riwayat di tanggal ini</div></div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {doneOrders.map(order => <OrderCard key={order.id} order={order} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="date" value={rekapDate} onChange={e => { setRekapDate(e.target.value); loadDone(e.target.value) }}
                className="bg-h-card border border-h-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-h-red transition-colors" />
              <span className="text-xs text-h-muted">{doneOrders.length > 0 ? `${doneOrders.length} transaksi` : 'Tidak ada data'}</span>
            </div>
          {doneOrders.length === 0 ? (
            <div className="text-center pt-10"><div className="text-5xl mb-4">📊</div><div className="text-h-muted text-sm">Tidak ada transaksi di tanggal ini</div></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-h-card border border-h-border rounded-2xl p-5">
                  <div className="text-xs text-h-muted uppercase tracking-wider mb-1">Total Pendapatan</div>
                  <div className="font-black text-white text-2xl">{formatRp(rekap.revenue)}</div>
                </div>
                <div className="bg-h-card border border-h-border rounded-2xl p-5">
                  <div className="text-xs text-h-muted uppercase tracking-wider mb-1">Order Selesai</div>
                  <div className="font-black text-white text-2xl">{rekap.orderCount}</div>
                  <div className="text-xs text-h-muted mt-1">Rata-rata {formatRp(Math.round(rekap.revenue / rekap.orderCount))}</div>
                </div>
              </div>
              <div className="bg-h-card border border-h-border rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-h-border">
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Per Metode Bayar</div>
                </div>
                <div className="divide-y divide-h-border">
                  {PAY_OPTS.map(opt => rekap.byMethod[opt.value] ? (
                    <div key={opt.value} className="px-5 py-3 flex justify-between items-center">
                      <span className="text-sm text-white">{opt.icon} {opt.label}</span>
                      <span className="font-bold text-white">{formatRp(rekap.byMethod[opt.value])}</span>
                    </div>
                  ) : null)}
                </div>
              </div>
              <div className="bg-h-card border border-h-border rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-h-border">
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Item Terlaris</div>
                </div>
                <div className="divide-y divide-h-border">
                  {rekap.topItems.map((item, i) => (
                    <div key={item.name} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-h-muted w-5">{i + 1}</span>
                        <div>
                          <div className="text-sm font-semibold text-white">{item.name}</div>
                          <div className="text-xs text-h-muted">{item.qty}x terjual</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-white">{formatRp(item.revenue)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          </div>
        )}
      </main>

      {/* ── Modal Tutup Kasir & Laporan ── */}
      {showCloseModal && (() => {
        const today = new Date().toISOString().slice(0, 10)
        const revenue = closeReportOrders.reduce((s, o) => s + orderTotal(o.items), 0)
        const byMethod: Record<string, { total: number; count: number }> = {}
        closeReportOrders.forEach(o => {
          const m = o.payment_method || 'lainnya'
          if (!byMethod[m]) byMethod[m] = { total: 0, count: 0 }
          byMethod[m].total += orderTotal(o.items)
          byMethod[m].count++
        })
        const itemMap: Record<string, { name: string; qty: number }> = {}
        closeReportOrders.forEach(o => o.items.forEach(i => {
          if (!itemMap[i.name]) itemMap[i.name] = { name: i.name, qty: 0 }
          itemMap[i.name].qty += i.qty
        }))
        const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5)
        const ratedOrders = closeReportOrders.filter(o => o.rating)
        const avgRating = ratedOrders.length
          ? (ratedOrders.reduce((s, o) => s + (o.rating || 0), 0) / ratedOrders.length).toFixed(1)
          : null
        const methodLabels: Record<string, string> = { tunai: '💵 Tunai', qris: '⬛ QRIS', transfer: '🏦 Transfer', lainnya: '💳 Lainnya' }
        const waText = buildDailyReport(closeReportOrders, today)
        const waUrl = `https://wa.me/${OWNER_WA}?text=${encodeURIComponent(waText)}`

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80" onClick={() => setShowCloseModal(false)} />
            <div className="relative bg-h-card border border-h-border rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-h-border flex items-center justify-between">
                <div>
                  <div className="font-sans font-black text-white uppercase tracking-wider">Tutup Kasir</div>
                  <div className="text-xs text-h-muted mt-0.5">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <button onClick={() => setShowCloseModal(false)} className="text-h-muted hover:text-white text-2xl leading-none">×</button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {closeReportLoading ? (
                  <div className="text-center py-10 text-h-muted text-sm animate-pulse">Memuat laporan...</div>
                ) : closeReportOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📋</div>
                    <div className="text-h-muted text-sm">Tidak ada transaksi hari ini</div>
                  </div>
                ) : (
                  <>
                    {/* KPI */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-h-dark border border-h-border rounded-xl p-4">
                        <div className="text-xs text-h-muted mb-1">Total Pendapatan</div>
                        <div className="font-black text-white text-xl">{formatRp(revenue)}</div>
                      </div>
                      <div className="bg-h-dark border border-h-border rounded-xl p-4">
                        <div className="text-xs text-h-muted mb-1">Transaksi</div>
                        <div className="font-black text-white text-xl">{closeReportOrders.length}</div>
                        {avgRating && <div className="text-xs text-yellow-400 mt-0.5">⭐ {avgRating} rata-rata</div>}
                      </div>
                    </div>

                    {/* Per metode */}
                    <div className="bg-h-dark border border-h-border rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-h-border text-xs font-bold text-h-muted uppercase tracking-wider">Per Metode Bayar</div>
                      {Object.entries(byMethod).map(([m, v]) => (
                        <div key={m} className="px-4 py-2.5 flex justify-between items-center border-b border-h-border last:border-0">
                          <span className="text-sm text-white">{methodLabels[m] || m}</span>
                          <div className="text-right">
                            <div className="text-sm font-bold text-white">{formatRp(v.total)}</div>
                            <div className="text-xs text-h-muted">{v.count} order</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Top items */}
                    {topItems.length > 0 && (
                      <div className="bg-h-dark border border-h-border rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-h-border text-xs font-bold text-h-muted uppercase tracking-wider">Top Item</div>
                        {topItems.map((item, i) => (
                          <div key={item.name} className="px-4 py-2.5 flex justify-between items-center border-b border-h-border last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-h-red font-black w-4">#{i+1}</span>
                              <span className="text-sm text-white">{item.name}</span>
                            </div>
                            <span className="text-xs text-h-muted font-bold">{item.qty}×</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-5 border-t border-h-border space-y-3">
                <a href={waUrl} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Kirim Laporan ke WA Owner
                </a>
                <button onClick={() => setShowCloseModal(false)}
                  className="w-full border border-h-border text-h-muted hover:text-white py-3 rounded-xl text-sm font-medium transition-colors">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
