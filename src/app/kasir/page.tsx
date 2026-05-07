'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order, OrderItem } from '@/types'

function formatRp(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }
function formatTime(s: string) { return new Date(s).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }
function orderTotal(items: OrderItem[]) { return items.reduce((s, i) => s + i.price * i.qty, 0) }

function playNewOrderSound() {
  try {
    const ctx = new AudioContext()
    const notes = [880, 1108, 1320]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.14
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      osc.start(t); osc.stop(t + 0.4)
    })
  } catch { /* blocked */ }
}

function OrderCard({ order, onDone }: { order: Order; onDone?: () => void }) {
  const total = orderTotal(order.items)
  const isNew = order.status === 'new'
  return (
    <div className={`bg-h-card rounded-2xl overflow-hidden border-l-4 ${isNew ? 'border-h-red' : 'border-h-border'}`}>
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-h-border">
        <div>
          <div className="font-sans font-black text-white text-lg uppercase tracking-wider">Meja {order.table_number}</div>
          {order.customer_name && <div className="text-xs text-h-muted mt-0.5">a/n {order.customer_name}</div>}
        </div>
        <div className="text-xs text-h-muted">{formatTime(order.created_at)}</div>
      </div>
      <div className="px-4 py-3 space-y-1.5 border-b border-h-border">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-white/80">{item.name} <span className="text-h-muted">×{item.qty}</span></span>
            <span className="text-h-muted">{formatRp(item.price * item.qty)}</span>
          </div>
        ))}
      </div>
      {order.note && (
        <div className="px-4 py-2 border-b border-h-border">
          <span className="text-xs text-yellow-400">📝 {order.note}</span>
        </div>
      )}
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-h-muted">Total</div>
          <div className="font-black text-white">{formatRp(total)}</div>
        </div>
        {onDone ? (
          <button onClick={onDone} className="bg-h-red hover:bg-h-red-d text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
            Selesai ✓
          </button>
        ) : (
          <span className="text-xs text-h-muted bg-h-border px-3 py-1.5 rounded-full">Selesai</span>
        )}
      </div>
    </div>
  )
}

type Tab = 'new' | 'history' | 'rekap'

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

  const markDone = async (id: string) => {
    setNewOrders(prev => prev.filter(o => o.id !== id))
    await supabase.from('orders').update({ status: 'done' }).eq('id', id)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
    if (res.ok) { localStorage.setItem('hallu-kasir', 'ok'); setAuthed(true) }
    else setPwError('Password salah')
  }

  const rekap = useMemo(() => {
    const revenue = doneOrders.reduce((s, o) => s + orderTotal(o.items), 0)
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {}
    doneOrders.forEach(o => o.items.forEach(item => {
      if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, qty: 0, revenue: 0 }
      itemMap[item.name].qty += item.qty
      itemMap[item.name].revenue += item.price * item.qty
    }))
    const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty)
    return { revenue, orderCount: doneOrders.length, topItems }
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
          <button type="submit" className="w-full bg-h-red hover:bg-h-red-d text-white py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-colors">
            Masuk
          </button>
        </form>
      </div>
    </div>
  )

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

      <div className="bg-h-dark border-b border-h-border sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex">
          {([['new', `Order Baru${newOrders.length > 0 ? ` (${newOrders.length})` : ''}`], ['history', 'Riwayat'], ['rekap', 'Rekap Hari Ini']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); if (t === 'history' || t === 'rekap') loadDone() }}
              className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${tab === t ? 'text-h-red border-h-red' : 'text-h-muted border-transparent hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-5">
        {loading ? (
          <div className="text-center text-h-muted text-sm pt-16">Memuat pesanan...</div>
        ) : tab === 'new' ? (
          newOrders.length === 0 ? (
            <div className="text-center pt-20">
              <div className="text-5xl mb-4">☕</div>
              <div className="text-h-muted text-sm">Belum ada pesanan baru</div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {newOrders.map(order => <OrderCard key={order.id} order={order} onDone={() => markDone(order.id)} />)}
            </div>
          )
        ) : tab === 'history' ? (
          doneOrders.length === 0 ? (
            <div className="text-center pt-20">
              <div className="text-5xl mb-4">📋</div>
              <div className="text-h-muted text-sm">Belum ada riwayat hari ini</div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doneOrders.map(order => <OrderCard key={order.id} order={order} />)}
            </div>
          )
        ) : (
          /* Rekap Tab */
          doneOrders.length === 0 ? (
            <div className="text-center pt-20">
              <div className="text-5xl mb-4">📊</div>
              <div className="text-h-muted text-sm">Belum ada transaksi hari ini</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Cards */}
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

              {/* Top Items */}
              <div className="bg-h-card border border-h-border rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-h-border">
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
