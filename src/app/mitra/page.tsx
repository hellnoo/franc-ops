import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { formatRupiah, getPeriodRange } from '@/lib/utils'
import LogoutButton from '@/components/LogoutButton'
import StatCard from '@/components/StatCard'
import PeriodFilter from '@/components/PeriodFilter'
import { WalletIcon, CoinsIcon, TrendIcon, StoreIcon, ChevronRightIcon } from '@/components/Icons'

export default async function MitraDashboard({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile || profile.role !== 'mitra') redirect('/')

  const range = getPeriodRange((await searchParams).period)

  const { data: outlets } = await supabase
    .from('outlets')
    .select('*')
    .eq('mitra_id', user.id)
    .eq('active', true)

  const outletIds = outlets?.map(o => o.id) || []
  const safeIds = outletIds.length ? outletIds : ['00000000-0000-0000-0000-000000000000']

  const { data: txToday } = await supabase
    .from('transactions')
    .select('outlet_id, total, transaction_items(hpp, qty)')
    .in('outlet_id', safeIds)
    .gte('created_at', range.sinceISO)

  const { data: expToday } = await supabase
    .from('expenses')
    .select('outlet_id, amount')
    .in('outlet_id', safeIds)
    .gte('expense_date', range.sinceDate)

  const outletStats: Record<string, { omzet: number; hpp: number; exp: number }> = {}
  const ensure = (id: string) => { if (!outletStats[id]) outletStats[id] = { omzet: 0, hpp: 0, exp: 0 } }
  txToday?.forEach(tx => {
    ensure(tx.outlet_id)
    outletStats[tx.outlet_id].omzet += tx.total
    tx.transaction_items?.forEach((item: { hpp: number; qty: number }) => {
      outletStats[tx.outlet_id].hpp += item.hpp * item.qty
    })
  })
  expToday?.forEach(e => { ensure(e.outlet_id); outletStats[e.outlet_id].exp += e.amount })

  const totalOmzet = Object.values(outletStats).reduce((s, v) => s + v.omzet, 0)
  const totalHpp = Object.values(outletStats).reduce((s, v) => s + v.hpp, 0)
  const totalExp = Object.values(outletStats).reduce((s, v) => s + v.exp, 0)
  const totalProfit = totalOmzet - totalHpp - totalExp

  return (
    <div className="min-h-screen">
      <header className="brand-header text-white px-4 pt-5 pb-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center ring-1 ring-white/20">
              <StoreIcon width={20} height={20} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/60">Mitra · Hallu</p>
              <h1 className="text-lg font-bold tracking-tight leading-tight">{profile.full_name}</h1>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="relative z-10 max-w-xl mx-auto px-4 py-6 space-y-7 -mt-2">
        <section>
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-sm font-semibold text-[var(--foreground)]">Rekap {range.label}</p>
            <PeriodFilter active={range.key} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Omzet" value={totalOmzet} tone="emerald" icon={<WalletIcon width={16} height={16} />} />
            <StatCard label="HPP + Biaya" value={totalHpp + totalExp} tone="amber" icon={<CoinsIcon width={16} height={16} />} />
            <StatCard label="Profit Bersih" value={totalProfit} tone="hallu" icon={<TrendIcon width={16} height={16} />} />
          </div>
        </section>

        <a href="/pengeluaran" className="card card-hover p-4 flex items-center gap-4">
          <span className="w-11 h-11 rounded-xl bg-[var(--hallu-50)] text-[var(--hallu)] flex items-center justify-center shrink-0">
            <CoinsIcon width={22} height={22} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-[var(--foreground)]">Catat Pengeluaran</p>
            <p className="text-xs text-[var(--stone)]">Biaya operasional outlet (gaji, sewa, dll)</p>
          </div>
          <ChevronRightIcon width={18} height={18} className="text-[var(--stone)]" />
        </a>

        <section>
          <p className="text-sm font-semibold text-[var(--foreground)] mb-3">Outlet Saya</p>
          <div className="space-y-3">
            {outlets?.map(outlet => {
              const stats = outletStats[outlet.id] || { omzet: 0, hpp: 0, exp: 0 }
              const profit = stats.omzet - stats.hpp - stats.exp
              return (
                <a key={outlet.id} href={`/mitra/outlets/${outlet.id}`} className="card card-hover p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[var(--hallu-50)] text-[var(--hallu)] flex items-center justify-center shrink-0">
                    <StoreIcon width={22} height={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--foreground)] truncate">{outlet.name}</p>
                    <p className="text-xs text-[var(--stone)] truncate">{outlet.address || 'Alamat belum diset'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[var(--foreground)]">{formatRupiah(stats.omzet)}</p>
                    <p className="text-xs font-medium" style={{ color: profit >= 0 ? '#34d399' : '#f87171' }}>
                      {profit >= 0 ? '+' : ''}{formatRupiah(profit)}
                    </p>
                  </div>
                  <ChevronRightIcon width={18} height={18} className="text-[var(--stone)] shrink-0" />
                </a>
              )
            })}
            {(!outlets || outlets.length === 0) && (
              <div className="card p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[var(--hallu-50)] text-[var(--hallu)] flex items-center justify-center mx-auto mb-3">
                  <StoreIcon width={24} height={24} />
                </div>
                <p className="text-sm font-medium text-[var(--foreground)]">Belum ada outlet</p>
                <p className="text-xs text-[var(--stone)] mt-1">Outlet akan muncul setelah didaftarkan owner</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
