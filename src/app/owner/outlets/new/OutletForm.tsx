'use client'

import { useState } from 'react'
import { createOutlet } from '@/lib/actions'

export default function OutletForm({ mitra }: { mitra: { id: string; full_name: string }[] }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Sukses → server action redirect ke /owner. Hanya tangani kasus error.
    const res = await createOutlet(new FormData(e.currentTarget))
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3">
      <input name="name" placeholder="Nama outlet" required className="input-field" />
      <input name="address" placeholder="Alamat (opsional)" className="input-field" />
      <select name="mitra_id" className="input-field">
        <option value="">— Pilih mitra (opsional) —</option>
        {mitra.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
      </select>
      {error && <div className="text-[13px] text-[var(--hallu)] bg-[var(--hallu-50)] rounded-lg px-3 py-2">{error}</div>}
      <button type="submit" disabled={loading} className="btn-brand w-full py-2.5 rounded-xl text-sm font-semibold">
        {loading ? 'Menyimpan…' : 'Simpan Outlet'}
      </button>
    </form>
  )
}
