'use client'

import { useState } from 'react'
import { createUser } from '@/lib/actions'

export default function UserForm({ outlets }: { outlets: { id: string; name: string }[] }) {
  const [role, setRole] = useState('kasir')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const formData = new FormData(e.currentTarget)
    const res = await createUser(formData)
    if (res?.error) {
      setMsg({ type: 'err', text: res.error })
    } else {
      setMsg({ type: 'ok', text: 'User berhasil dibuat' })
      e.currentTarget.reset()
      setRole('kasir')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3">
      <p className="text-sm font-semibold text-[var(--foreground)]">Tambah User Baru</p>

      <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--cream)] rounded-xl">
        <button type="button" onClick={() => setRole('kasir')} className={`py-2 rounded-lg text-sm font-medium transition-all ${role === 'kasir' ? 'btn-brand' : 'text-[var(--stone)]'}`}>
          Kasir
        </button>
        <button type="button" onClick={() => setRole('mitra')} className={`py-2 rounded-lg text-sm font-medium transition-all ${role === 'mitra' ? 'btn-brand' : 'text-[var(--stone)]'}`}>
          Mitra
        </button>
      </div>
      <input type="hidden" name="role" value={role} />

      <input name="full_name" placeholder="Nama lengkap" required className="input-field" />
      <input name="email" type="email" placeholder="Email" required className="input-field" />
      <input name="password" type="text" placeholder="Password (min. 6 karakter)" required minLength={6} className="input-field" />

      {role === 'kasir' && (
        <select name="outlet_id" className="input-field">
          <option value="">— Pilih outlet (opsional) —</option>
          {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      )}

      {msg && (
        <div className={`text-[13px] rounded-lg px-3 py-2 ${msg.type === 'ok' ? 'text-emerald-700 bg-emerald-50' : 'text-[var(--hallu)] bg-[var(--hallu-50)]'}`}>{msg.text}</div>
      )}

      <button type="submit" disabled={loading} className="btn-brand w-full py-2.5 rounded-xl text-sm font-semibold">
        {loading ? 'Menyimpan…' : `Tambah ${role === 'kasir' ? 'Kasir' : 'Mitra'}`}
      </button>
    </form>
  )
}
