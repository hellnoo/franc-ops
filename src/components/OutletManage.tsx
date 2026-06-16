'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOutlet, deactivateOutlet } from '@/lib/actions'

export default function OutletManage({ outlet, mitra }: {
  outlet: { id: string; name: string; address: string | null; mitra_id: string | null }
  mitra: { id: string; full_name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const router = useRouter()

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const res = await updateOutlet(outlet.id, new FormData(e.currentTarget))
    setMsg(res?.error ? { type: 'err', text: res.error } : { type: 'ok', text: 'Outlet diperbarui' })
    setBusy(false)
    router.refresh()
  }

  async function handleDeactivate() {
    if (!confirm(`Nonaktifkan outlet ${outlet.name}? Tidak akan tampil lagi di dashboard.`)) return
    setBusy(true)
    const res = await deactivateOutlet(outlet.id)
    if (res?.error) { setMsg({ type: 'err', text: res.error }); setBusy(false) }
    else router.push('/owner')
  }

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full p-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--foreground)]">Pengaturan Outlet</span>
        <span className="text-xs font-medium text-[var(--hallu)]">{open ? 'Tutup' : 'Buka'}</span>
      </button>
      {open && (
        <form onSubmit={handleSave} className="px-4 pb-4 pt-0 space-y-3 border-t border-[var(--glass-border)]">
          <input name="name" defaultValue={outlet.name} required className="input-field mt-3" placeholder="Nama outlet" />
          <input name="address" defaultValue={outlet.address || ''} className="input-field" placeholder="Alamat" />
          <select name="mitra_id" defaultValue={outlet.mitra_id || ''} className="input-field">
            <option value="">— Tanpa mitra —</option>
            {mitra.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          {msg && <div className={`text-[13px] rounded-lg px-3 py-2 ${msg.type === 'ok' ? 'text-emerald-300 bg-emerald-500/10' : 'text-[var(--hallu)] bg-[var(--hallu-50)]'}`}>{msg.text}</div>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-brand flex-1 py-2.5 rounded-xl text-sm font-semibold">Simpan Perubahan</button>
            <button type="button" disabled={busy} onClick={handleDeactivate} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--hallu)] border border-[var(--hallu-100)] hover:bg-[var(--hallu-50)]">Nonaktifkan</button>
          </div>
        </form>
      )}
    </div>
  )
}
