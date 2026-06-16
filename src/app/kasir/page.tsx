'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatRupiah } from '@/lib/utils'
import type { MenuItem, Outlet } from '@/types'
import { CoffeeIcon, ReceiptIcon, LogoutIcon, PlusIcon, CoinsIcon } from '@/components/Icons'
import { Monogram } from '@/components/Brand'

interface CartItem extends MenuItem {
  qty: number
}

export default function KasirPage() {
  const [outlet, setOutlet] = useState<Outlet | null>(null)
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [profile, setProfile] = useState<{ full_name: string } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setProfile(prof)
      const { data: assignment } = await supabase
        .from('outlet_kasir')
        .select('outlet_id, outlets(*)')
        .eq('kasir_id', user.id)
        .single()
      if (assignment?.outlets) setOutlet(assignment.outlets as unknown as Outlet)
      const { data: menuData } = await supabase.from('menu_items').select('*').eq('active', true).order('category')
      setMenu(menuData || [])
      setLoading(false)
    }
    load()
  }, [])

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  function removeFromCart(id: string) {
    setCart(prev => {
      const existing = prev.find(c => c.id === id)
      if (!existing) return prev
      if (existing.qty === 1) return prev.filter(c => c.id !== id)
      return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const totalQty = cart.reduce((s, c) => s + c.qty, 0)

  async function handleSubmit() {
    if (!outlet || cart.length === 0) return
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: tx, error } = await supabase.from('transactions').insert({
      outlet_id: outlet.id, kasir_id: user?.id, total,
    }).select().single()
    if (!error && tx) {
      await supabase.from('transaction_items').insert(
        cart.map(c => ({ transaction_id: tx.id, menu_item_id: c.id, menu_name: c.name, price: c.price, hpp: c.hpp, qty: c.qty }))
      )
      setCart([])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    }
    setSubmitting(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-[var(--stone)]">
        <CoffeeIcon width={28} height={28} className="animate-pulse text-[var(--hallu)]" />
        <p className="text-sm">Memuat menu…</p>
      </div>
    </div>
  )

  const categories = [...new Set(menu.map(m => m.category || 'Lainnya'))]

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="brand-header text-white px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center ring-1 ring-white/20">
              <Monogram className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/60">Kasir · {outlet?.name || 'Belum di-assign'}</p>
              <h1 className="text-sm font-bold leading-tight">{profile?.full_name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/pengeluaran" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/90 bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg">
              <CoinsIcon width={15} height={15} /> Pengeluaran
            </a>
            <button onClick={handleLogout} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/90 bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg">
              <LogoutIcon width={15} height={15} /> Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Menu */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-xs font-semibold text-[var(--stone)] uppercase tracking-wide mb-2.5">{cat}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {menu.filter(m => (m.category || 'Lainnya') === cat).map(item => {
                  const inCart = cart.find(c => c.id === item.id)
                  return (
                    <button key={item.id} onClick={() => addToCart(item)}
                      className={`card card-hover p-3 text-left relative ${inCart ? 'ring-2 ring-[var(--hallu)]' : ''}`}>
                      {inCart && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full text-white text-[11px] font-bold flex items-center justify-center brand-gradient">
                          {inCart.qty}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-[var(--foreground)] pr-5">{item.name}</p>
                      <p className="text-xs text-[var(--hallu)] font-medium mt-1">{formatRupiah(item.price)}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {menu.length === 0 && (
            <div className="card p-10 text-center mt-4">
              <CoffeeIcon width={28} height={28} className="text-[var(--hallu)] mx-auto mb-2" />
              <p className="text-sm font-medium text-[var(--foreground)]">Belum ada menu</p>
              <p className="text-xs text-[var(--stone)] mt-1">Minta owner menambahkan menu dulu</p>
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="w-72 bg-black/20 backdrop-blur-xl border-l border-[var(--glass-border)] flex flex-col shrink-0">
          <div className="px-4 py-3.5 border-b border-[var(--glass-border)] flex items-center gap-2">
            <ReceiptIcon width={18} height={18} className="text-[var(--hallu)]" />
            <p className="font-semibold text-[var(--foreground)]">Pesanan</p>
            {totalQty > 0 && <span className="ml-auto text-xs font-semibold text-white brand-gradient px-2 py-0.5 rounded-full">{totalQty}</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 && (
              <div className="text-center mt-10 text-[var(--stone)]">
                <ReceiptIcon width={24} height={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">Belum ada pesanan</p>
              </div>
            )}
            {cart.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-2 bg-[var(--cream)] rounded-lg p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--foreground)] truncate">{item.name}</p>
                  <p className="text-xs text-[var(--stone)]">{formatRupiah(item.price * item.qty)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-full bg-white/5 border border-[var(--glass-border)] text-sm flex items-center justify-center text-[var(--foreground)] hover:bg-white/10">−</button>
                  <span className="text-xs w-4 text-center font-semibold">{item.qty}</span>
                  <button onClick={() => addToCart(item)} className="w-6 h-6 rounded-full text-white flex items-center justify-center brand-gradient"><PlusIcon width={13} height={13} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-[var(--glass-border)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--stone)]">Total</span>
              <span className="text-lg font-bold text-[var(--foreground)] tracking-tight">{formatRupiah(total)}</span>
            </div>
            <button onClick={handleSubmit} disabled={cart.length === 0 || submitting}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${success ? 'bg-emerald-600 text-white' : 'btn-brand'}`}>
              {success ? '✓ Tersimpan!' : submitting ? 'Menyimpan…' : 'Simpan Transaksi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
