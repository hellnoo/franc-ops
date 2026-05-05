'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order, OrderItem } from '@/types'

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

function formatTime(s: string) {
  return new Date(s).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function orderTotal(items: OrderItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}

function playNewOrderSound() {
  try {
    const ctx = new AudioContext()
    const notes = [880, 1108, 1320]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.14
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  } catch {
    // AudioContext blocked or not supported
  }
}

function OrderCard({ order, onDone }: { order: Order; onDone?: () => void }) {
  const total = orderTotal(order.items)
  const isNew = order.status === 'new'

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden ${
        isNew ? 'border-emerald-200' : 'border-gray-100'
      }`}
    >
      <div className={`px-4 py-2.5 flex items-center justify-between ${isNew ? 'bg-emerald-50' : 'bg-gray-50'}`}>
        <div className="font-serif font-bold text-forest text-lg">Meja {order.table_number}</div>
        <div className="text-xs text-gray-400">{formatTime(order.created_at)}</div>
      </div>

      <div className="px-4 py-3 space-y-1.5 border-b border-gray-100">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.name}
              <span className="text-gray-400 ml-1">×{item.qty}</span>
            </span>
            <span className="text-gray-500">{formatRp(item.price * item.qty)}</span>
          </div>
        ))}
      </div>

      {order.note && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
          <span className="text-xs text-amber-700">📝 {order.note}</span>
        </div>
      )}

      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-400">Total</div>
          <div className="font-bold text-forest">{formatRp(total)}</div>
        </div>
        {onDone ? (
          <button
            onClick={onDone}
            className="bg-forest hover:bg-forest-mid text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors"
          >
            Selesai ✓
          </button>
        ) : (
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">Selesai</span>
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
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'new')
      .order('created_at', { ascending: true })
    if (data) setNewOrders(data as Order[])
    setLoading(false)
  }

  const loadDone = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'done')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
    if (data) setDoneOrders(data as Order[])
  }

  useEffect(() => {
    loadNew().then(() => {
      initialized.current = true
    })
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('kasir-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new as Order
          setNewOrders((prev) => {
            if (prev.find((o) => o.id === order.id)) return prev
            return [...prev, order].sort((a, b) =>
              a.created_at.localeCompare(b.created_at)
            )
          })
          if (initialized.current) {
            playNewOrderSound()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as Order
          if (updated.status === 'done') {
            setNewOrders((prev) => prev.filter((o) => o.id !== updated.id))
            setDoneOrders((prev) => {
              if (prev.find((o) => o.id === updated.id)) return prev
              return [updated, ...prev]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const count = newOrders.length
    document.title = count > 0 ? `${count} Order Baru | Hall-U Kasir` : 'Hall-U Kasir'
  }, [newOrders])

  const markDone = async (id: string) => {
    setNewOrders((prev) => prev.filter((o) => o.id !== id))
    await supabase.from('orders').update({ status: 'done' }).eq('id', id)
  }

  return (
    <div className="min-h-screen bg-warm">
      <header className="bg-forest shadow-lg">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-serif text-xl font-black text-emerald-400">Hall-U Café</div>
            <div className="text-white/30 text-[0.6rem] tracking-[3px] uppercase mt-0.5">
              Dashboard Kasir
            </div>
          </div>
          <div className="flex items-center gap-3">
            {newOrders.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                {newOrders.length} baru
              </span>
            )}
            <a href="/" className="text-white/40 hover:text-white/70 text-sm transition-colors">
              ←
            </a>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex">
          {(['new', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t)
                if (t === 'history') loadDone()
              }}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
                tab === t
                  ? 'text-emerald-600 border-emerald-500'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              {t === 'new'
                ? `Order Baru${newOrders.length > 0 ? ` (${newOrders.length})` : ''}`
                : 'Riwayat Hari Ini'}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-5">
        {loading ? (
          <div className="text-center text-gray-400 text-sm pt-16">Memuat pesanan...</div>
        ) : tab === 'new' ? (
          newOrders.length === 0 ? (
            <div className="text-center pt-20">
              <div className="text-5xl mb-4">☕</div>
              <div className="text-gray-400 text-sm">Belum ada pesanan baru</div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {newOrders.map((order) => (
                <OrderCard key={order.id} order={order} onDone={() => markDone(order.id)} />
              ))}
            </div>
          )
        ) : doneOrders.length === 0 ? (
          <div className="text-center pt-20">
            <div className="text-5xl mb-4">📋</div>
            <div className="text-gray-400 text-sm">Belum ada riwayat hari ini</div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {doneOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
