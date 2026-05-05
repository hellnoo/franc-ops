'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MenuItem } from '@/types'

const CATEGORIES = ['Kopi', 'Non-Kopi', 'Makanan', 'Lainnya'] as const

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

type FormData = Omit<MenuItem, 'id' | 'created_at'>

const BLANK: FormData = {
  name: '',
  description: '',
  price: 0,
  category: 'Kopi',
  available: true,
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        value ? 'bg-emerald-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
          value ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState<FormData>(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('hallu-admin') === 'ok') {
      setAuthed(true)
    }
  }, [])

  useEffect(() => {
    if (authed) loadItems()
  }, [authed])

  const loadItems = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .order('category')
      .order('name')
    if (data) setItems(data as MenuItem[])
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) {
      localStorage.setItem('hallu-admin', 'ok')
      setAuthed(true)
    } else {
      setPwError('Password salah')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('hallu-admin')
    setAuthed(false)
    setPw('')
  }

  const openAdd = () => {
    setEditing(null)
    setForm(BLANK)
    setShowForm(true)
  }

  const openEdit = (item: MenuItem) => {
    setEditing(item)
    setForm({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category,
      available: item.available,
    })
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    if (editing) {
      await supabase.from('menu_items').update(form).eq('id', editing.id)
    } else {
      await supabase.from('menu_items').insert(form)
    }
    await loadItems()
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus item ini dari menu?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const toggleAvailable = async (item: MenuItem) => {
    const next = !item.available
    await supabase.from('menu_items').update({ available: next }).eq('id', item.id)
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available: next } : i)))
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-forest flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-8">
            <div className="font-serif text-2xl font-black text-forest">Hall-U Café</div>
            <div className="text-gray-400 text-xs tracking-widest uppercase mt-1">Admin Panel</div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 block mb-1.5">Password</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setPwError('') }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400 transition-colors text-sm"
                placeholder="Masukkan password admin"
                autoFocus
              />
              {pwError && <p className="text-red-500 text-xs mt-1">{pwError}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-forest hover:bg-forest-mid text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Masuk
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm">
      <header className="bg-forest shadow-lg">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-serif text-xl font-black text-emerald-400">Hall-U Café</div>
            <div className="text-white/30 text-[0.6rem] tracking-[3px] uppercase mt-0.5">Admin Panel</div>
          </div>
          <div className="flex items-center gap-4">
            <a href="/admin/qr" className="text-white/60 hover:text-white text-sm transition-colors">
              QR Generator
            </a>
            <a href="/kasir" className="text-white/60 hover:text-white text-sm transition-colors">
              Kasir
            </a>
            <button
              onClick={handleLogout}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-full text-sm transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-serif text-xl font-bold text-forest">Kelola Menu</h1>
          <button
            onClick={openAdd}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors"
          >
            + Tambah Item
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 text-sm pt-10">Memuat data...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Nama', 'Kategori', 'Harga', 'Status', 'Aksi'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-400 text-sm py-12">
                        Belum ada item menu. Klik &quot;+ Tambah Item&quot; untuk mulai.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-sm text-gray-900">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-gray-400 mt-0.5 max-w-[240px] truncate">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">{item.category}</td>
                        <td className="px-4 py-3.5 text-sm font-medium text-gray-800">
                          {formatRp(item.price)}
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => toggleAvailable(item)}
                            className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                              item.available
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                          >
                            {item.available ? 'Tersedia' : 'Habis'}
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => openEdit(item)}
                              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-sm text-red-500 hover:text-red-600 font-medium"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg font-bold text-forest">
                {editing ? 'Edit Item' : 'Tambah Item Menu'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-300 hover:text-gray-500 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1.5">
                  Nama *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                  placeholder="Nama menu"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:border-emerald-400 transition-colors"
                  rows={2}
                  placeholder="Deskripsi singkat (opsional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1.5">
                    Harga (Rp) *
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    step={500}
                    value={form.price || ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                    placeholder="15000"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1.5">
                    Kategori *
                  </label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-400 transition-colors bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Toggle
                  value={form.available}
                  onChange={(v) => setForm((f) => ({ ...f, available: v }))}
                />
                <span className="text-sm text-gray-600">
                  {form.available ? 'Tersedia' : 'Tidak tersedia / Habis'}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-500 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-forest hover:bg-forest-mid disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
