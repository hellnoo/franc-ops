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
      <form onSubmit={handleAdd} className="card p-4 space-y-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">Tambah Menu</p>
        <input name="name" placeholder="Nama menu" required className="input-field" />
        <input name="category" placeholder="Kategori (mis. Kopi, Non-Kopi)" className="input-field" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--stone)] mb-1">Harga Jual</label>
            <input name="price" type="number" placeholder="0" required className="input-field" />
          </div>
          <div>
            <label className="block text-xs text-[var(--stone)] mb-1">HPP (modal)</label>
            <input name="hpp" type="number" placeholder="0" className="input-field" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-brand w-full py-2.5 rounded-xl text-sm font-semibold">
          {loading ? 'Menyimpan…' : 'Tambah Menu'}
        </button>
      </form>

      {/* Daftar menu */}
      <div className="space-y-2">
        {menu.map(item => {
          const margin = item.price - item.hpp
          return (
            <div key={item.id} className="card p-3.5">
              {editing === item.id ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{item.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-[var(--stone)] mb-1">Harga</label>
                      <input type="number" value={editPrice} onChange={e => setEditPrice(+e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--stone)] mb-1">HPP</label>
                      <input type="number" value={editHpp} onChange={e => setEditHpp(+e.target.value)} className="input-field" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(item.id)} className="btn-brand flex-1 py-2 rounded-lg text-xs font-semibold">Simpan</button>
                    <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg text-[var(--stone)] text-xs font-semibold border border-[#e7ddd6]">Batal</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">{item.name}</p>
                      {item.category && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--cream)] text-[var(--stone)] shrink-0">{item.category}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-[var(--foreground)]">Jual {formatRupiah(item.price)}</span>
                      <span className="text-orange-600">HPP {formatRupiah(item.hpp)}</span>
                      <span className="font-semibold" style={{ color: '#059669' }}>+{formatRupiah(margin)}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs shrink-0">
                    <button onClick={() => { setEditing(item.id); setEditPrice(item.price); setEditHpp(item.hpp) }} className="font-medium text-[var(--hallu)] hover:underline">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="font-medium text-[var(--stone)] hover:text-[var(--hallu)]">Hapus</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {menu.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">Belum ada menu</p>
            <p className="text-xs text-[var(--stone)] mt-1">Tambah menu pertama di form atas</p>
          </div>
        )}
      </div>
    </div>
  )
}
