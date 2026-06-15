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
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
      <p className="text-sm font-semibold text-gray-900">Tambah User Baru</p>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setRole('kasir')} className={`py-2 rounded-lg text-sm font-medium border ${role === 'kasir' ? 'text-white border-transparent' : 'text-gray-600 border-gray-200'}`} style={role === 'kasir' ? { backgroundColor: '#7C1515' } : {}}>
          Kasir
        </button>
        <button type="button" onClick={() => setRole('mitra')} className={`py-2 rounded-lg text-sm font-medium border ${role === 'mitra' ? 'text-white border-transparent' : 'text-gray-600 border-gray-200'}`} style={role === 'mitra' ? { backgroundColor: '#7C1515' } : {}}>
          Mitra
        </button>
      </div>
      <input type="hidden" name="role" value={role} />

      <input name="full_name" placeholder="Nama lengkap" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
      <input name="email" type="email" placeholder="Email" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
      <input name="password" type="text" placeholder="Password" required minLength={6} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />

      {role === 'kasir' && (
        <select name="outlet_id" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">— Pilih outlet (opsional) —</option>
          {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      )}

      {msg && <p className={`text-sm ${msg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}

      <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: '#7C1515' }}>
        {loading ? 'Menyimpan...' : `Tambah ${role === 'kasir' ? 'Kasir' : 'Mitra'}`}
      </button>
    </form>
  )
}
