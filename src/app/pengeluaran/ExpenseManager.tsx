'use client'

import { useState } from 'react'
import { createExpense, deleteExpense } from '@/lib/actions'
import { formatRupiah } from '@/lib/utils'
import type { Expense, ExpenseCategory } from '@/types'

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'bahan', label: 'Bahan' },
  { value: 'gaji', label: 'Gaji' },
  { value: 'sewa', label: 'Sewa' },
  { value: 'listrik', label: 'Listrik' },
  { value: 'operasional', label: 'Operasional' },
  { value: 'lain', label: 'Lain-lain' },
]
const catLabel = (c: string) => CATEGORIES.find(x => x.value === c)?.label || c

export default function ExpenseManager({ outlets, expenses, outletNames }: {
  outlets: { id: string; name: string }[]
  expenses: Expense[]
  outletNames: Record<string, string>
}) {
  const today = new Date().toISOString().split('T')[0]
  const [loading, setLoading] = useState(false)
  const [cat, setCat] = useState<ExpenseCategory>('bahan')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const totalThisMonth = expenses
    .filter(e => e.expense_date.slice(0, 7) === today.slice(0, 7))
    .reduce((s, e) => s + e.amount, 0)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const form = e.currentTarget
    const res = await createExpense(new FormData(form))
    if (res?.error) setMsg({ type: 'err', text: res.error })
    else { setMsg({ type: 'ok', text: 'Pengeluaran tercatat' }); form.reset(); setCat('bahan') }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await deleteExpense(id)
  }

  if (outlets.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-medium text-[var(--foreground)]">Belum ada outlet</p>
        <p className="text-xs text-[var(--stone)] mt-1">Pengeluaran butuh outlet yang sudah terdaftar</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-[var(--muted)]">Total bulan ini</span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-amber-400" style={{ textShadow: '0 0 18px rgba(251,191,36,0.4)' }}>
          {formatRupiah(totalThisMonth)}
        </p>
      </div>

      <form onSubmit={handleAdd} className="card p-4 space-y-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">Catat Pengeluaran</p>

        {outlets.length > 1 ? (
          <select name="outlet_id" required className="input-field">
            <option value="">— Pilih outlet —</option>
            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        ) : (
          <input type="hidden" name="outlet_id" value={outlets[0].id} />
        )}

        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(c => (
            <button type="button" key={c.value} onClick={() => setCat(c.value)}
              className={`py-2 rounded-lg text-xs font-medium transition-all ${cat === c.value ? 'btn-brand' : 'text-[var(--stone)] border border-[var(--glass-border)]'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="category" value={cat} />

        <input name="amount" type="number" inputMode="numeric" placeholder="Nominal (Rp)" required className="input-field" />
        <input name="description" placeholder="Keterangan (opsional)" className="input-field" />
        <input name="expense_date" type="date" defaultValue={today} className="input-field" />

        {msg && (
          <div className={`text-[13px] rounded-lg px-3 py-2 ${msg.type === 'ok' ? 'text-emerald-300 bg-emerald-500/10' : 'text-[var(--hallu)] bg-[var(--hallu-50)]'}`}>{msg.text}</div>
        )}

        <button type="submit" disabled={loading} className="btn-brand w-full py-2.5 rounded-xl text-sm font-semibold">
          {loading ? 'Menyimpan…' : 'Simpan Pengeluaran'}
        </button>
      </form>

      <div>
        <p className="text-xs text-[var(--stone)] mb-2 font-semibold uppercase tracking-wide">Riwayat 30 Hari</p>
        <div className="space-y-2">
          {expenses.map(exp => (
            <div key={exp.id} className="card p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--hallu-50)] text-[var(--hallu)] shrink-0">{catLabel(exp.category)}</span>
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{exp.description || '—'}</p>
                </div>
                <p className="text-xs text-[var(--stone)] mt-0.5">
                  {new Date(exp.expense_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  {outlets.length > 1 && outletNames[exp.outlet_id] ? ` · ${outletNames[exp.outlet_id]}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-sm font-bold text-amber-400">{formatRupiah(exp.amount)}</p>
                <button onClick={() => handleDelete(exp.id)} className="text-xs font-medium text-[var(--stone)] hover:text-[var(--hallu)]">Hapus</button>
              </div>
            </div>
          ))}
          {expenses.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">Belum ada pengeluaran</p>
              <p className="text-xs text-[var(--stone)] mt-1">Catat pengeluaran pertama di form atas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
