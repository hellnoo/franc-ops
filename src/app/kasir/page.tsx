'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatRupiah } from '@/lib/utils'
import type { MenuItem, Outlet } from '@/types'

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
  const supabase = createClient()

  useEffect(() => {
    async function load() {
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

  async function handleSubmit() {
    if (!outlet || cart.length === 0) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: tx, error } = await supabase.from('transactions').insert({
      outlet_id: outlet.id,
      kasir_id: user?.id,
      total,
    }).select().single()

    if (!error && tx) {
      await supabase.from('transaction_items').insert(
        cart.map(c => ({
          transaction_id: tx.id,
          menu_item_id: c.id,
          menu_name: c.name,
          price: c.price,
          hpp: c.hpp,
          qty: c.qty,
        }))
      )
      setCart([])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    }
    setSubmitting(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>

  const categories = [...new Set(menu.map(m => m.category || 'Lainnya'))]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#7C1515' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-200 text-xs">Kasir — {outlet?.name || 'Belum assign'}</p>
            <h1 className="text-base font-bold">{profile?.full_name}</h1>
          </div>
          <button onClick={handleLogout} className="text-xs text-red-200 hover:text-white">Keluar</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Menu */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat}</p>
              <div className="grid grid-cols-2 gap-2">
                {menu.filter(m => (m.category || 'Lainnya') === cat).map(item => {
                  const inCart = cart.find(c => c.id === item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`bg-white rounded-xl p-3 text-left shadow-sm border transition-all ${inCart ? 'border-red-300' : 'border-gray-100'}`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatRupiah(item.price)}</p>
                      {inCart && <p className="text-xs font-bold mt-1" style={{ color: '#7C1515' }}>x{inCart.qty}</p>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Cart */}
        <div className="w-64 bg-white border-l border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <p className="font-semibold text-gray-900">Pesanan</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 && <p className="text-xs text-gray-400 text-center mt-4">Belum ada pesanan</p>}
            {cart.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{formatRupiah(item.price)}</p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => removeFromCart(item.id)} className="w-5 h-5 rounded-full bg-gray-100 text-xs flex items-center justify-center">-</button>
                  <span className="text-xs w-4 text-center font-medium">{item.qty}</span>
                  <button onClick={() => addToCart(item)} className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{ backgroundColor: '#7C1515' }}>+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-100 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Total</span>
              <span className="text-sm font-bold text-gray-900">{formatRupiah(total)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || submitting}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: '#7C1515' }}
            >
              {success ? '✓ Tersimpan!' : submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
