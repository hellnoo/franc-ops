'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MenuItem, HppComponent } from '@/types'

const CATEGORIES = ['Kopi', 'Non-Kopi', 'Makanan', 'Lainnya'] as const
function formatRp(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }
function margin(price: number, hpp: number) {
  if (!hpp || !price) return null
  return Math.round((price - hpp) / price * 100)
}
function marginColor(m: number) {
  if (m >= 60) return 'text-green-400'
  if (m >= 40) return 'text-yellow-400'
  return 'text-h-red'
}

type FormData = Omit<MenuItem, 'id' | 'created_at' | 'image_url'>
const BLANK: FormData = { name: '', description: '', price: 0, hpp: 0, hpp_components: [], category: 'Kopi', available: true }

// Compress & resize gambar sebelum upload (max 900px, JPEG 82%)
async function compressImage(file: File, maxPx = 900, quality = 0.82): Promise<Blob> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', quality)
    }
    img.src = url
  })
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-h-red' : 'bg-h-border'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

type AdminTab = 'menu' | 'hpp'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState(''); const [pwError, setPwError] = useState('')
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<AdminTab>('menu')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState<FormData>(BLANK)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

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
    setForm({ name: item.name, description: item.description || '', price: item.price, hpp: item.hpp || 0, hpp_components: item.hpp_components || [], category: item.category, available: item.available })
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

  const handleImageUpload = async (itemId: string, file: File) => {
    setUploadingId(itemId)
    try {
      const compressed = await compressImage(file)
      const path = `${itemId}.jpg`
      const { error: upErr } = await supabase.storage.from('menu-images').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(path)
      await supabase.from('menu_items').update({ image_url: publicUrl }).eq('id', itemId)
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, image_url: publicUrl } : i))
    } catch { alert('Gagal upload foto. Pastikan bucket menu-images sudah dibuat di Supabase Storage.') }
    setUploadingId(null)
  }

  const handleImageRemove = async (item: MenuItem) => {
    await supabase.from('menu_items').update({ image_url: null }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, image_url: null } : i))
  }

  const toggleAvailable = async (item: MenuItem) => {
    const next = !item.available
    await supabase.from('menu_items').update({ available: next }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, available: next } : i))
  }

  // HPP stats
  const hppStats = items.map(i => ({
    ...i,
    margin: margin(i.price, i.hpp),
    profit: i.hpp ? i.price - i.hpp : null,
  })).sort((a, b) => (b.margin ?? -1) - (a.margin ?? -1))
  const avgMargin = (() => {
    const withHpp = hppStats.filter(i => i.margin !== null)
    if (!withHpp.length) return null
    return Math.round(withHpp.reduce((s, i) => s + (i.margin ?? 0), 0) / withHpp.length)
  })()

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

      {/* Tabs */}
      <div className="bg-h-dark border-b border-h-border">
        <div className="max-w-5xl mx-auto flex">
          {([['menu', 'Kelola Menu'], ['hpp', 'HPP & Margin']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-6 py-3.5 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${tab === key ? 'text-h-red border-h-red' : 'text-h-muted border-transparent hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* ── TAB: Kelola Menu ── */}
        {tab === 'menu' && (
          <>
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
                  <table className="w-full min-w-[640px]">
                    <thead className="border-b border-h-border">
                      <tr>{['Foto', 'Nama', 'Kategori', 'Harga', 'HPP', 'Margin', 'Status', 'Aksi'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-h-muted uppercase tracking-wider">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-h-border">
                      {items.length === 0 ? (
                        <tr><td colSpan={8} className="text-center text-h-muted text-sm py-12">Belum ada item menu.</td></tr>
                      ) : items.map(item => {
                        const m = margin(item.price, item.hpp)
                        return (
                          <tr key={item.id} className="hover:bg-h-dark/50 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                {item.image_url ? (
                                  <div className="relative group">
                                    <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-h-border" />
                                    <button onClick={() => handleImageRemove(item)}
                                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-h-red rounded-full text-white text-[8px] font-black items-center justify-center hidden group-hover:flex leading-none">×</button>
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg border border-dashed border-h-border flex items-center justify-center text-h-muted text-lg">📷</div>
                                )}
                                <label className={`cursor-pointer text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${uploadingId === item.id ? 'border-h-border text-h-muted' : 'border-h-border text-h-muted hover:border-h-red hover:text-h-red'}`}>
                                  <input type="file" accept="image/*" className="hidden" disabled={uploadingId === item.id}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(item.id, f); e.target.value = '' }} />
                                  {uploadingId === item.id ? '⏳' : item.image_url ? 'Ganti' : 'Upload'}
                                </label>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-sm text-white">{item.name}</div>
                              {item.description && <div className="text-xs text-h-muted mt-0.5 max-w-[180px] truncate">{item.description}</div>}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-h-muted">{item.category}</td>
                            <td className="px-4 py-3.5 text-sm font-bold text-white">{formatRp(item.price)}</td>
                            <td className="px-4 py-3.5 text-sm text-h-muted">{item.hpp ? formatRp(item.hpp) : <span className="text-h-border">—</span>}</td>
                            <td className="px-4 py-3.5">
                              {m !== null
                                ? <span className={`text-sm font-bold ${marginColor(m)}`}>{m}%</span>
                                : <span className="text-h-border text-sm">—</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              <button onClick={() => toggleAvailable(item)}
                                className={`text-xs font-bold px-3 py-1 rounded-full transition-colors uppercase tracking-wide ${item.available ? 'bg-h-red/20 text-h-red hover:bg-h-red/30' : 'bg-h-border text-h-muted hover:bg-h-border/80'}`}>
                                {item.available ? 'Tersedia' : 'Habis'}
                              </button>
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
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB: HPP & Margin ── */}
        {tab === 'hpp' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h1 className="font-sans text-lg font-black text-white uppercase tracking-wider">HPP &amp; Margin</h1>
              {avgMargin !== null && (
                <div className="text-sm text-h-muted">Rata-rata margin: <span className={`font-black ${marginColor(avgMargin)}`}>{avgMargin}%</span></div>
              )}
            </div>

            {/* Summary cards */}
            {!loading && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Margin ≥ 60%', value: hppStats.filter(i => (i.margin ?? 0) >= 60).length, color: 'text-green-400' },
                  { label: 'Margin 40–59%', value: hppStats.filter(i => { const m = i.margin ?? 0; return m >= 40 && m < 60 }).length, color: 'text-yellow-400' },
                  { label: 'Margin < 40%', value: hppStats.filter(i => i.margin !== null && (i.margin ?? 0) < 40).length, color: 'text-h-red' },
                ].map(s => (
                  <div key={s.label} className="bg-h-card border border-h-border rounded-2xl p-4">
                    <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-h-muted mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Per item table */}
            <div className="bg-h-card border border-h-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead className="border-b border-h-border">
                    <tr>{['Item', 'Kategori', 'HPP', 'Harga Jual', 'Profit/unit', 'Margin'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-h-muted uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-h-border">
                    {loading ? (
                      <tr><td colSpan={6} className="text-center text-h-muted text-sm py-10">Memuat...</td></tr>
                    ) : hppStats.map(item => (
                      <tr key={item.id} className="hover:bg-h-dark/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-sm text-white">{item.name}</div>
                          {!item.hpp && <div className="text-[10px] text-h-border mt-0.5">HPP belum diisi — klik Edit</div>}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-h-muted">{item.category}</td>
                        <td className="px-4 py-3.5 text-sm text-h-muted">{item.hpp ? formatRp(item.hpp) : <span className="text-h-border">—</span>}</td>
                        <td className="px-4 py-3.5 text-sm font-bold text-white">{formatRp(item.price)}</td>
                        <td className="px-4 py-3.5 text-sm font-bold text-green-400">{item.profit !== null ? formatRp(item.profit) : <span className="text-h-border">—</span>}</td>
                        <td className="px-4 py-3.5">
                          {item.margin !== null
                            ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-h-border rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${item.margin >= 60 ? 'bg-green-400' : item.margin >= 40 ? 'bg-yellow-400' : 'bg-h-red'}`}
                                    style={{ width: `${Math.min(100, item.margin)}%` }} />
                                </div>
                                <span className={`text-sm font-black ${marginColor(item.margin)}`}>{item.margin}%</span>
                              </div>
                            )
                            : <span className="text-h-border text-sm">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-h-muted">* Isi HPP per item lewat tab <button onClick={() => { setTab('menu') }} className="text-h-red hover:underline">Kelola Menu → Edit</button></p>
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
                  <label className="text-xs text-h-muted font-bold uppercase tracking-wide block mb-1.5">Harga Jual (Rp) *</label>
                  <input required type="number" min={0} step={500} value={form.price || ''}
                    onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-h-dark border border-h-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-h-red text-white transition-colors"
                    placeholder="25000" />
                </div>
                <div>
                  <label className="text-xs text-h-muted font-bold uppercase tracking-wide block mb-1.5">HPP (Rp)</label>
                  <input type="number" min={0} step={500} value={form.hpp || ''}
                    onChange={e => setForm(f => ({ ...f, hpp: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-h-dark border border-h-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-h-red text-white transition-colors"
                    placeholder="otomatis dari kalkulator" />
                  {form.hpp > 0 && form.price > 0 && (
                    <div className={`text-xs mt-1 font-bold ${marginColor(margin(form.price, form.hpp)!)}`}>
                      Margin: {margin(form.price, form.hpp)}% · Profit {formatRp(form.price - form.hpp)}/unit
                    </div>
                  )}
                </div>
              </div>
              {/* ── Kalkulator HPP ── */}
              <div className="bg-h-dark border border-h-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-h-muted font-bold uppercase tracking-wide">Kalkulator HPP</label>
                  <button type="button"
                    onClick={() => {
                      const comps: HppComponent[] = [...(form.hpp_components || []), { nama: '', biaya: 0 }]
                      const total = comps.reduce((s, c) => s + (c.biaya || 0), 0)
                      setForm(f => ({ ...f, hpp_components: comps, hpp: total }))
                    }}
                    className="text-xs text-h-red hover:text-white font-bold border border-h-red/40 hover:border-h-red px-2.5 py-1 rounded-lg transition-colors">
                    + Komponen
                  </button>
                </div>
                {(form.hpp_components || []).length === 0 && (
                  <p className="text-xs text-h-border text-center py-2">Klik "+ Komponen" untuk mulai hitung HPP</p>
                )}
                {(form.hpp_components || []).map((comp, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={comp.nama} placeholder="Nama (misal: Kopi 18g)"
                      onChange={e => {
                        const comps = [...(form.hpp_components || [])]
                        comps[i] = { ...comps[i], nama: e.target.value }
                        setForm(f => ({ ...f, hpp_components: comps }))
                      }}
                      className="flex-1 bg-h-card border border-h-border rounded-lg px-3 py-2 text-xs text-white placeholder-h-muted focus:outline-none focus:border-h-red transition-colors" />
                    <div className="relative flex-shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-h-muted">Rp</span>
                      <input type="number" min={0} step={100}
                        value={comp.biaya || ''}
                        placeholder="0"
                        onChange={e => {
                          const comps = [...(form.hpp_components || [])]
                          comps[i] = { ...comps[i], biaya: parseInt(e.target.value) || 0 }
                          const total = comps.reduce((s, c) => s + (c.biaya || 0), 0)
                          setForm(f => ({ ...f, hpp_components: comps, hpp: total }))
                        }}
                        className="w-28 bg-h-card border border-h-border rounded-lg pl-7 pr-2 py-2 text-xs text-white focus:outline-none focus:border-h-red transition-colors" />
                    </div>
                    <button type="button"
                      onClick={() => {
                        const comps = (form.hpp_components || []).filter((_, j) => j !== i)
                        const total = comps.reduce((s, c) => s + (c.biaya || 0), 0)
                        setForm(f => ({ ...f, hpp_components: comps, hpp: total }))
                      }}
                      className="text-h-muted hover:text-h-red text-lg leading-none flex-shrink-0 transition-colors">×</button>
                  </div>
                ))}
                {(form.hpp_components || []).length > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t border-h-border">
                    <span className="text-xs text-h-muted">Total HPP</span>
                    <span className="text-sm font-black text-white">{formatRp(form.hpp)}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-h-muted font-bold uppercase tracking-wide block mb-1.5">Kategori *</label>
                <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-h-dark border border-h-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-h-red text-white transition-colors">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
