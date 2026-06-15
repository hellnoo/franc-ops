'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOutlet } from '@/lib/actions'

export default function OutletForm({ mitra }: { mitra: { id: string; full_name: string }[] }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await createOutlet(new FormData(e.currentTarget))
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      router.push('/owner')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
      <input name="name" placeholder="Nama outlet" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
      <input name="address" placeholder="Alamat (opsional)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
      <select name="mitra_id" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
        <option value="">— Pilih mitra (opsional) —</option>
        {mitra.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: '#7C1515' }}>
        {loading ? 'Menyimpan...' : 'Simpan Outlet'}
      </button>
    </form>
  )
}
