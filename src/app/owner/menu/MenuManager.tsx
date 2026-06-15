'use client'

import { useState } from 'react'
import { createMenuItem, updateMenuHpp, deleteMenuItem } from '@/lib/actions'
import { formatRupiah } from '@/lib/utils'
import type { MenuItem } from '@/types'

export default function MenuManager({ menu }: { menu: MenuItem[] }) {
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState(0)
  const [editHpp, setEditHpp] = useState(0)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = e.currentTarget
    await createMenuItem(new FormData(form))
    form.reset()
    setLoading(false)
  }

  async function handleSaveEdit(id: string) {
    await updateMenuHpp(id, editHpp, editPrice)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    await deleteMenuItem(id)
  }

  return (
    <div className="space-y-6">
      {/* Form tambah */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Tambah Menu</p>
        <input name="name" placeholder="Nama menu" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        <input name="category" placeholder="Kategori (mis. Kopi, Non-Kopi)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Harga Jual</label>
            <input name="price" type="number" placeholder="0" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">HPP (modal)</label>
            <input name="hpp" type="number" placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: '#7C1515' }}>
          {loading ? 'Menyimpan...' : 'Tambah Menu'}
        </button>
      </form>

      {/* Daftar menu */}
      <div className="space-y-2">
        {menu.map(item => {
          const margin = item.price - item.hpp
          return (
            <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              {editing === item.id ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500">Harga</label>
                      <input type="number" value={editPrice} onChange={e => setEditPrice(+e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">HPP</label>
                      <input type="number" value={editHpp} onChange={e => setEditHpp(+e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(item.id)} className="flex-1 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: '#7C1515' }}>Simpan</button>
                    <button onClick={() => setEditing(null)} className="flex-1 py-1.5 rounded-lg text-gray-600 text-xs font-semibold border border-gray-200">Batal</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.category || 'Tanpa kategori'}</p>
                    <p className="text-xs mt-0.5">
                      <span className="text-gray-600">Jual {formatRupiah(item.price)}</span>
                      <span className="text-orange-600"> · HPP {formatRupiah(item.hpp)}</span>
                      <span style={{ color: '#7C1515' }}> · Margin {formatRupiah(margin)}</span>
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => { setEditing(item.id); setEditPrice(item.price); setEditHpp(item.hpp) }} className="text-gray-500 hover:text-gray-900">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">Hapus</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {menu.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Belum ada menu</p>}
      </div>
    </div>
  )
}
