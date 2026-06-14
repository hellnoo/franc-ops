import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { formatRupiah } from '@/lib/utils'
import LogoutButton from '@/components/LogoutButton'

export default async function OwnerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner') redirect('/')

  // Semua outlet
  const { data: outlets } = await supabase
    .from('outlets')
    .select('*, profiles(full_name)')
    .eq('active', true)
    .order('created_at', { ascending: false })

  // Summary transaksi hari ini per outlet
  const today = new Date().toISOString().split('T')[0]
  const { data: txToday } = await supabase
    .from('transactions')
    .select('outlet_id, total, transaction_items(hpp, qty)')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)

  // Hitung omzet & HPP per outlet
  const outletStats: Record<string, { omzet: number; hpp: number }> = {}
  txToday?.forEach(tx => {
    if (!outletStats[tx.outlet_id]) outletStats[tx.outlet_id] = { omzet: 0, hpp: 0 }
    outletStats[tx.outlet_id].omzet += tx.total
    tx.transaction_items?.forEach((item: { hpp: number; qty: number }) => {
      outletStats[tx.outlet_id].hpp += item.hpp * item.qty
    })
  })

  const totalOmzet = Object.values(outletStats).reduce((s, v) => s + v.omzet, 0)
  const totalHpp = Object.values(outletStats).reduce((s, v) => s + v.hpp, 0)
  const totalProfit = totalOmzet - totalHpp

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="text-white px-4 py-4" style={{ backgroundColor: '#7C1515' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-red-200 text-xs">Owner</p>
            <h1 className="text-lg font-bold">Hallu Franc-Ops</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-100">{profile.full_name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Hari Ini */}
        <div>
          <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Rekap Hari Ini</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500">Omzet</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatRupiah(totalOmzet)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500">HPP</p>
              <p className="text-lg font-bold text-orange-600 mt-1">{formatRupiah(totalHpp)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500">Profit</p>
              <p className="text-lg font-bold mt-1" style={{ color: '#7C1515' }}>{formatRupiah(totalProfit)}</p>
            </div>
          </div>
        </div>

        {/* Outlet List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Outlet Aktif</p>
            <a href="/owner/outlets/new" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: '#7C1515' }}>
              + Tambah Outlet
            </a>
          </div>
          <div className="space-y-3">
            {outlets?.map(outlet => {
              const stats = outletStats[outlet.id] || { omzet: 0, hpp: 0 }
              const profit = stats.omzet - stats.hpp
              return (
                <a key={outlet.id} href={`/owner/outlets/${outlet.id}`} className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-red-200 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{outlet.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{outlet.address || 'Alamat belum diset'}</p>
                      <p className="text-xs text-gray-400">Mitra: {outlet.profiles?.full_name || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Omzet hari ini</p>
                      <p className="font-bold text-gray-900">{formatRupiah(stats.omzet)}</p>
                      <p className="text-xs font-medium" style={{ color: profit >= 0 ? '#7C1515' : '#dc2626' }}>
                        Profit: {formatRupiah(profit)}
                      </p>
                    </div>
                  </div>
                </a>
              )
            })}
            {(!outlets || outlets.length === 0) && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
                <p className="text-sm">Belum ada outlet. Tambah outlet pertama!</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <a href="/owner/menu" className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-red-200 transition-colors">
            <p className="text-sm font-semibold text-gray-900">Menu & HPP</p>
            <p className="text-xs text-gray-400 mt-1">Kelola menu dan input HPP</p>
          </a>
          <a href="/owner/users" className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-red-200 transition-colors">
            <p className="text-sm font-semibold text-gray-900">Kelola User</p>
            <p className="text-xs text-gray-400 mt-1">Tambah mitra & kasir</p>
          </a>
        </div>
      </div>
    </div>
  )
}
