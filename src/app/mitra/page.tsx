import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { formatRupiah } from '@/lib/utils'
import LogoutButton from '@/components/LogoutButton'

export default async function MitraDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile || profile.role !== 'mitra') redirect('/')

  const { data: outlets } = await supabase
    .from('outlets')
    .select('*')
    .eq('mitra_id', user.id)
    .eq('active', true)

  const outletIds = outlets?.map(o => o.id) || []

  const today = new Date().toISOString().split('T')[0]
  const { data: txToday } = await supabase
    .from('transactions')
    .select('outlet_id, total, transaction_items(hpp, qty)')
    .in('outlet_id', outletIds)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)

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
      <header className="text-white px-4 py-4" style={{ backgroundColor: '#7C1515' }}>
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-red-200 text-xs">Mitra</p>
            <h1 className="text-lg font-bold">{profile.full_name}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Summary */}
        <div>
          <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Rekap Hari Ini</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500">Omzet</p>
              <p className="text-base font-bold text-gray-900 mt-1">{formatRupiah(totalOmzet)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500">HPP</p>
              <p className="text-base font-bold text-orange-600 mt-1">{formatRupiah(totalHpp)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500">Profit</p>
              <p className="text-base font-bold mt-1" style={{ color: '#7C1515' }}>{formatRupiah(totalProfit)}</p>
            </div>
          </div>
        </div>

        {/* Outlets */}
        <div>
          <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Outlet Saya</p>
          <div className="space-y-3">
            {outlets?.map(outlet => {
              const stats = outletStats[outlet.id] || { omzet: 0, hpp: 0 }
              const profit = stats.omzet - stats.hpp
              return (
                <a key={outlet.id} href={`/mitra/outlets/${outlet.id}`} className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-red-200 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{outlet.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{outlet.address || 'Alamat belum diset'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Omzet</p>
                      <p className="font-bold text-gray-900">{formatRupiah(stats.omzet)}</p>
                      <p className="text-xs font-medium" style={{ color: '#7C1515' }}>
                        Profit: {formatRupiah(profit)}
                      </p>
                    </div>
                  </div>
                </a>
              )
            })}
            {(!outlets || outlets.length === 0) && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
                <p className="text-sm">Belum ada outlet yang terdaftar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
