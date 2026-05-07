'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MenuItem } from '@/types'

const CATEGORIES = ['Kopi', 'Non-Kopi', 'Makanan', 'Lainnya'] as const
function formatRp(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }
type FormData = Omit<MenuItem, 'id' | 'created_at'>
const BLANK: FormData = { name: '', description: '', price: 0, category: 'Kopi', available: true }

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-h-red' : 'bg-h-border'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState(''); const [pwError, setPwError] = useState('')
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState<FormData>(BLANK)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => { if (localStorage.getItem('hallu-admin') === 'ok') setAuthed(true) }, [])
  useEffect(() => { if (authed) loadItems() }, [authed])

  const loadItems = async () => {
    setLoading(true)
    const { data } = await supabase.from('menu_items').select('*').order('category').order('name')
    if (data) setItems(data as MenuItem[])
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
    if (res.ok) { localStorage.setItem('hallu-admin', 'ok'); setAuthed(true) }
    else setPwError('Password salah')
  }

  const openAdd = () => { setEditing(null); setForm(BLANK); setShowForm(true) }
  const openEdit = (item: MenuItem) => {
    setEditing(item)
    setForm({ name: item.name, description: item.description || '', price: item.price, category: item.category, available: item.available })
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    if (editing) await supabase.from('menu_items').update(form).eq('id', editing.id)
    else await supabase.from('menu_items').insert(form)
    await loadItems(); setShowForm(false); setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('menu_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setConfirmDeleteId(null)
  }

  const toggleAvailable = async (item: MenuItem) => {
    const next = !item.available
    await supabase.from('menu_items').update({ available: next }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, available: next } : i))
  }

  if (!authed) return (
    <div className="min-h-screen bg-h-bg flex items-center justify-center p-6">
      <div className="bg-h-card border border-h-border rounded-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-sans text-2xl font-black text-white tracking-widest uppercase">HALL-U</div>
          <div className="flex items-center gap-2 justify-center mt-1">
            <div className="h-px w-6 bg-h-red" />
            <div className="text-h-red text-[0.5rem] tracking-[3px] uppercase font-semibold">Admin Panel</div>
            <div className="h-px w-6 bg-h-red" />
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-h-muted font-semibold uppercase tracking-wide block mb-1.5">Password</label>
            <input type="password" value={pw} onChange={e => { setPw(e.target.value); setPwError('') }}
              className="w-full bg-h-dark border border-h-border rounded-xl px-4 py-3 focus:outline-none focus:border-h-red transition-colors text-sm text-white placeholder-h-muted"
              placeholder="Masukkan password admin" autoFocus />
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
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-sans text-xl font-black text-white tracking-widest uppercase">HALL-U</div>
            <div className="text-h-red text-[0.55rem] tracking-[3px] uppercase font-semibold mt-0.5">Admin Panel</div>
          </div>
          <div className="flex items-center gap-4">
            <a href="/admin/qr" className="text-h-muted hover:text-white text-sm transition-colors">QR Generator</a>
            <a href="/kasir" className="text-h-muted hover:text-white text-sm transition-colors">Kasir</a>
            <button onClick={() => { localStorage.removeItem('hallu-admin'); setAuthed(false) }}
              className="border border-h-border hover:border-white/30 text-h-muted hover:text-white px-4 py-1.5 rounded-full text-sm transition-colors">
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-sans text-lg font-black text-white uppercase tracking-wider">Kelola Menu</h1>
          <button onClick={openAdd} className="bg-h-red hover:bg-h-red-d text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
            + Tambah Item
          </button>
        </div>

        {loading ? (
          <div className="text-center text-h-muted text-sm pt-10">Memuat data...</div>
        ) : (
          <div className="bg-h-card border border-h-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="border-b border-h-border">
                  <tr>{['Nama', 'Kategori', 'Harga', 'Status', 'Aksi'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-h-muted uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-h-border">
                  {items.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-h-muted text-sm py-12">Belum ada item menu.</td></tr>
                  ) : items.map(item => (
                    <tr key={item.id} className="hover:bg-h-dark/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-sm text-white">{item.name}</div>
                        {item.description && <div className="text-xs text-h-muted mt-0.5 max-w-[240px] truncate">{item.description}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-h-muted">{item.category}</td>
                      <td className="px-4 py-3.5 text-sm font-bold text-white">{formatRp(item.price)}</td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => toggleAvailable(item)}
                          className={`text-xs font-bold px-3 py-1 rounded-full transition-colors uppercase tracking-wide ${
                            item.available ? 'bg-h-red/20 text-h-red hover:bg-h-red/30' : 'bg-h-border text-h-muted hover:bg-h-border/80'
                          }`}>{item.available ? 'Tersedia' : 'Habis'}</button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEdit(item)} className="text-xs text-h-red hover:text-h-red-d font-bold uppercase">Edit</button>
                          {confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleDelete(item.id)} className="text-xs text-white bg-h-red hover:bg-h-red-d px-2 py-1 rounded font-bold uppercase">Yakin</button>
                              <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-h-muted hover:text-white font-bold uppercase">Batal</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(item.id)} className="text-xs text-h-muted hover:text-white font-bold uppercase">Hapus</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowForm(false)} />
          <div className="relative bg-h-card border border-h-border rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-sans text-base font-black text-white uppercase tracking-wider">{editing ? 'Edit Item' : 'Tambah Item'}</h2>
              <button onClick={() => setShowForm(false)} className="text-h-muted hover:text-white text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-h-muted font-bold uppercase tracking-wide block mb-1.5">Nama *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-h-dark border border-h-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-h-red text-white placeholder-h-muted transition-colors"
                  placeholder="Nama menu" />
              </div>
              <div>
                <label className="text-xs text-h-muted font-bold uppercase tracking-wide block mb-1.5">Deskripsi</label>
                <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-h-dark border border-h-border rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:border-h-red text-white placeholder-h-muted transition-colors"
                  rows={2} placeholder="Deskripsi singkat (opsional)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-h-muted font-bold uppercase tracking-wide block mb-1.5">Harga (Rp) *</label>
                  <input required type="number" min={0} step={500} value={form.price || ''}
                    onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-h-dark border border-h-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-h-red text-white transition-colors"
                    placeholder="15000" />
                </div>
                <div>
                  <label className="text-xs text-h-muted font-bold uppercase tracking-wide block mb-1.5">Kategori *</label>
                  <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-h-dark border border-h-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-h-red text-white transition-colors">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Toggle value={form.available} onChange={v => setForm(f => ({ ...f, available: v }))} />
                <span className="text-sm text-h-muted">{form.available ? 'Tersedia' : 'Tidak tersedia / Habis'}</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-h-border text-h-muted py-3 rounded-xl text-sm font-medium hover:border-white/20 hover:text-white transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-h-red hover:bg-h-red-d disabled:opacity-60 text-white py-3 rounded-xl text-sm font-black uppercase tracking-wide transition-colors">
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
