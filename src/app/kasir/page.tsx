'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState } from 'react'
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
        <div className="font-sans font-black text-white text-lg uppercase tracking-wider">Meja {order.table_number}</div>
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

type Tab = 'new' | 'history'

export default function KasirPage() {
  const [newOrders, setNewOrders] = useState<Order[]>([])
  const [doneOrders, setDoneOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<Tab>('new')
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

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

  useEffect(() => { loadNew().then(() => { initialized.current = true }) }, [])

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    const count = newOrders.length
    document.title = count > 0 ? `${count} Order Baru | Hall-U Kasir` : 'Hall-U Kasir'
  }, [newOrders])

  const markDone = async (id: string) => {
    setNewOrders(prev => prev.filter(o => o.id !== id))
    await supabase.from('orders').update({ status: 'done' }).eq('id', id)
  }

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
            <a href="/" className="text-h-muted hover:text-white text-sm transition-colors">←</a>
          </div>
        </div>
      </header>

      <div className="bg-h-dark border-b border-h-border sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex">
          {(['new', 'history'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); if (t === 'history') loadDone() }}
              className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${
                tab === t ? 'text-h-red border-h-red' : 'text-h-muted border-transparent hover:text-white'
              }`}
            >
              {t === 'new' ? `Order Baru${newOrders.length > 0 ? ` (${newOrders.length})` : ''}` : 'Riwayat Hari Ini'}
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
        ) : doneOrders.length === 0 ? (
          <div className="text-center pt-20">
            <div className="text-5xl mb-4">📋</div>
            <div className="text-h-muted text-sm">Belum ada riwayat hari ini</div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {doneOrders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </main>
    </div>
  )
}
