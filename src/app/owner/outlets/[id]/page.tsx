import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { formatRupiah, getPeriodRange, toWibDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import PeriodFilter from '@/components/PeriodFilter'
import TransactionHistory from '@/components/TransactionHistory'
import OutletManage from '@/components/OutletManage'
import ExportButton from '@/components/ExportButton'
import { WalletIcon, CoinsIcon, TrendIcon } from '@/components/Icons'

export default async function OutletDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ period?: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner') redirect('/')

  const { data: outlet } = await supabase
    .from('outlets')
    .select('*, profiles!outlets_mitra_id_fkey(full_name)')
    .eq('id', id)
    .single()
  if (!outlet) notFound()

  const { data: mitra } = await supabase.from('profiles').select('id, full_name').eq('role', 'mitra')

  const range = getPeriodRange((await searchParams).period, '30d')
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, total, created_at, transaction_items(menu_name, price, hpp, qty)')
    .eq('outlet_id', id)
    .gte('created_at', range.sinceISO)
    .order('created_at', { ascending: false })

  const { data: exps } = await supabase
    .from('expenses')
    .select('amount, expense_date')
    .eq('outlet_id', id)
    .gte('expense_date', range.sinceDate)

  // Rekap per hari (WIB)
  const byDay: Record<string, { omzet: number; hpp: number; exp: number; count: number }> = {}
  const ensureDay = (d: string) => { if (!byDay[d]) byDay[d] = { omzet: 0, hpp: 0, exp: 0, count: 0 } }
  let totalOmzet = 0, totalHpp = 0, totalExp = 0
  txs?.forEach(tx => {
    const day = toWibDate(tx.created_at)
    ensureDay(day)
    byDay[day].omzet += tx.total
    byDay[day].count += 1
    totalOmzet += tx.total
    tx.transaction_items?.forEach((it: { hpp: number; qty: number }) => {
      byDay[day].hpp += it.hpp * it.qty
      totalHpp += it.hpp * it.qty
    })
  })
  exps?.forEach(e => { ensureDay(e.expense_date); byDay[e.expense_date].exp += e.amount; totalExp += e.amount })
  const days = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div className="min-h-screen">
      <PageHeader title={outlet.name} subtitle={`Mitra: ${outlet.profiles?.full_name || '-'}`} back="/owner" vtName={`outlet-${id}`} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-sm font-semibold text-[var(--foreground)]">Rekap {range.label}</p>
            <PeriodFilter active={range.key} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Omzet" value={totalOmzet} tone="emerald" icon={<WalletIcon width={16} height={16} />} />
            <StatCard label="HPP + Biaya" value={totalHpp + totalExp} tone="amber" icon={<CoinsIcon width={16} height={16} />} />
            <StatCard label="Profit Bersih" value={totalOmzet - totalHpp - totalExp} tone="hallu" icon={<TrendIcon width={16} height={16} />} />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-sm font-semibold text-[var(--foreground)]">Per Hari</p>
            <ExportButton filename={`${outlet.name}-${range.key}`} rows={days.map(([day, s]) => ({ date: day, omzet: s.omzet, hpp: s.hpp, exp: s.exp }))} />
          </div>
          <div className="space-y-2">
            {days.map(([day, s]) => {
              const net = s.omzet - s.hpp - s.exp
              return (
              <div key={day} className="card p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{new Date(day).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <p className="text-xs text-[var(--stone)]">{s.count} transaksi{s.exp > 0 ? ` · biaya ${formatRupiah(s.exp)}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--foreground)]">{formatRupiah(s.omzet)}</p>
                  <p className="text-xs font-medium" style={{ color: net >= 0 ? '#34d399' : '#f87171' }}>{net >= 0 ? '+' : ''}{formatRupiah(net)}</p>
                </div>
              </div>
            )})}
            {days.length === 0 && (
              <div className="card p-8 text-center">
                <p className="text-sm font-medium text-[var(--foreground)]">Belum ada transaksi</p>
                <p className="text-xs text-[var(--stone)] mt-1">Data muncul setelah kasir input order</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <p className="text-sm font-semibold text-[var(--foreground)] mb-3">Riwayat Transaksi</p>
          <TransactionHistory txs={txs || []} />
        </section>

        <OutletManage outlet={outlet} mitra={mitra || []} />
      </div>
    </div>
  )
}
