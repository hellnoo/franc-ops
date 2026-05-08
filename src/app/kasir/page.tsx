'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { MenuItem, Order, OrderItem } from '@/types'

function formatRp(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }
function formatTime(s: string) { return new Date(s).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }
function orderTotal(items: OrderItem[]) { return items.reduce((s, i) => s + i.price * i.qty, 0) }

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

function OrderCard({ order, onDone }: { order: Order; onDone?: (method: PayMethod) => void }) {
  const [paying, setPaying] = useState(false)
  const total = orderTotal(order.items)
  const isNew = order.status === 'new'
  const payOpt = PAY_OPTS.find(p => p.value === order.payment_method)

  return (
    <div className={`bg-h-card rounded-2xl overflow-hidden border-l-4 ${isNew ? 'border-h-red' : 'border-h-border'}`}>
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
          {onDone && !paying && (
            <button
              onClick={() => order.payment_method ? onDone(order.payment_method as PayMethod) : setPaying(true)}
              className="bg-h-red hover:bg-h-red-d text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
              Selesai ✓
            </button>
          )}
          {!onDone && <span className="text-xs text-h-muted bg-h-border px-3 py-1.5 rounded-full">Selesai</span>}
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
  const initialized = useRef(false)

  useEffect(() => { if (localStorage.getItem('hallu-kasir') === 'ok') setAuthed(true) }, [])

  const loadNew = async () => {
    const { data } = await supabase.from('orders').select('*').eq('status', 'new').order('created_at', { ascending: true })
    if (data) setNewOrders(data as Order[])
    setLoading(false)
  }

  const loadDone = async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const { data } = await supabase.from('orders').select('*').eq('status', 'done').gte('created_at', today.toISOString()).order('created_at', { ascending: false })
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
        if (initialized.current) playNewOrderSound()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        const updated = payload.new as Order
        if (updated.status === 'done') {
          setNewOrders(prev => prev.filter(o => o.id !== updated.id))
          setDoneOrders(prev => prev.find(o => o.id === updated.id) ? prev : [updated, ...prev])
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [authed])

  useEffect(() => {
    const count = newOrders.length
    document.title = count > 0 ? `${count} Order Baru | Hall-U Kasir` : 'Hall-U Kasir'
  }, [newOrders])

  const markDone = async (id: string, method: PayMethod) => {
    setNewOrders(prev => prev.filter(o => o.id !== id))
    await supabase.from('orders').update({ status: 'done', payment_method: method }).eq('id', id)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
    if (res.ok) { localStorage.setItem('hallu-kasir', 'ok'); setAuthed(true) }
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
    <div className="min-h-screen bg-h-bg">
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
            <button key={key} onClick={() => { setTab(key); if (key === 'history' || key === 'rekap') loadDone() }}
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
              {newOrders.map(order => <OrderCard key={order.id} order={order} onDone={(m) => markDone(order.id, m)} />)}
            </div>
          )
        ) : tab === 'history' ? (
          doneOrders.length === 0 ? (
            <div className="text-center pt-20"><div className="text-5xl mb-4">📋</div><div className="text-h-muted text-sm">Belum ada riwayat hari ini</div></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doneOrders.map(order => <OrderCard key={order.id} order={order} />)}
            </div>
          )
        ) : (
          doneOrders.length === 0 ? (
            <div className="text-center pt-20"><div className="text-5xl mb-4">📊</div><div className="text-h-muted text-sm">Belum ada transaksi hari ini</div></div>
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
          )
        )}
      </main>
    </div>
  )
}
