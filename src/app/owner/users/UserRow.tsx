'use client'

import { useState } from 'react'
import { updateUserName, resetUserPassword, deleteUser, setKasirOutlet } from '@/lib/actions'
import { UsersIcon } from '@/components/Icons'
import type { Profile } from '@/types'

export default function UserRow({ user, outlets, currentOutletId }: {
  user: Profile
  outlets: { id: string; name: string }[]
  currentOutletId?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(user.full_name)
  const [pwd, setPwd] = useState('')
  const [outletId, setOutletId] = useState(currentOutletId || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function run(fn: () => Promise<{ error?: string; success?: boolean }>, okText: string) {
    setBusy(true); setMsg(null)
    const res = await fn()
    setMsg(res?.error ? { type: 'err', text: res.error } : { type: 'ok', text: okText })
    setBusy(false)
  }

  const outletName = outlets.find(o => o.id === currentOutletId)?.name

  return (
    <div className="card overflow-hidden">
      <div className="p-3 flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-[var(--hallu-50)] text-[var(--hallu)] flex items-center justify-center shrink-0"><UsersIcon width={16} height={16} /></span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)] truncate">{user.full_name}</p>
          {user.role === 'kasir' && <p className="text-xs text-[var(--stone)]">{outletName ? `Outlet: ${outletName}` : 'Belum di-assign'}</p>}
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-xs font-medium text-[var(--hallu)] hover:underline shrink-0">
          {open ? 'Tutup' : 'Kelola'}
        </button>
      </div>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-[var(--glass-border)] space-y-3">
          {/* Rename */}
          <div className="flex gap-2">
            <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Nama" />
            <button disabled={busy} onClick={() => run(() => updateUserName(user.id, name), 'Nama diperbarui')} className="btn-brand px-3 rounded-xl text-xs font-semibold shrink-0">Simpan</button>
          </div>

          {/* Reset password */}
          <div className="flex gap-2">
            <input value={pwd} onChange={e => setPwd(e.target.value)} className="input-field" placeholder="Password baru (min. 6)" />
            <button disabled={busy || pwd.length < 6} onClick={() => run(async () => { const r = await resetUserPassword(user.id, pwd); if (r.success) setPwd(''); return r }, 'Password direset')} className="btn-brand px-3 rounded-xl text-xs font-semibold shrink-0">Reset</button>
          </div>

          {/* Kasir: change outlet */}
          {user.role === 'kasir' && (
            <div className="flex gap-2">
              <select value={outletId} onChange={e => setOutletId(e.target.value)} className="input-field">
                <option value="">— Tanpa outlet —</option>
                {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <button disabled={busy} onClick={() => run(() => setKasirOutlet(user.id, outletId || null), 'Outlet diperbarui')} className="btn-brand px-3 rounded-xl text-xs font-semibold shrink-0">Pindah</button>
            </div>
          )}

          {msg && <div className={`text-[13px] rounded-lg px-3 py-2 ${msg.type === 'ok' ? 'text-emerald-300 bg-emerald-500/10' : 'text-[var(--hallu)] bg-[var(--hallu-50)]'}`}>{msg.text}</div>}

          {/* Delete */}
          <button
            disabled={busy}
            onClick={() => { if (confirm(`Hapus user ${user.full_name}? Tindakan ini permanen.`)) run(() => deleteUser(user.id), 'User dihapus') }}
            className="w-full py-2 rounded-xl text-xs font-semibold text-[var(--hallu)] border border-[var(--hallu-100)] hover:bg-[var(--hallu-50)]"
          >
            Hapus User
          </button>
        </div>
      )}
    </div>
  )
}
