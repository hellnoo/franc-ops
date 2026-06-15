import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { formatRupiah } from '@/lib/utils'

export default async function MitraOutletDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'mitra') redirect('/')

  // RLS memastikan mitra hanya bisa baca outlet miliknya
  const { data: outlet } = await supabase
    .from('outlets')
    .select('*')
    .eq('id', id)
    .single()
  if (!outlet) notFound()

  const since = new Date()
  since.setDate(since.getDate() - 30)
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, total, created_at, transaction_items(menu_name, price, hpp, qty)')
    .eq('outlet_id', id)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  const byDay: Record<string, { omzet: number; hpp: number; count: number }> = {}
  let totalOmzet = 0, totalHpp = 0
  txs?.forEach(tx => {
    const day = tx.created_at.split('T')[0]
    if (!byDay[day]) byDay[day] = { omzet: 0, hpp: 0, count: 0 }
    byDay[day].omzet += tx.total
    byDay[day].count += 1
    totalOmzet += tx.total
    tx.transaction_items?.forEach((it: { hpp: number; qty: number }) => {
      byDay[day].hpp += it.hpp * it.qty
      totalHpp += it.hpp * it.qty
    })
  })
  const days = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-4" style={{ backgroundColor: '#7C1515' }}>
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <a href="/mitra" className="text-red-200 hover:text-white">←</a>
          <h1 className="text-lg font-bold">{outlet.name}</h1>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <div>
          <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Rekap 30 Hari</p>
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
              <p className="text-base font-bold mt-1" style={{ color: '#7C1515' }}>{formatRupiah(totalOmzet - totalHpp)}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Per Hari</p>
          <div className="space-y-2">
            {days.map(([day, s]) => (
              <div key={day} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{new Date(day).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <p className="text-xs text-gray-400">{s.count} transaksi</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatRupiah(s.omzet)}</p>
                  <p className="text-xs" style={{ color: '#7C1515' }}>Profit {formatRupiah(s.omzet - s.hpp)}</p>
                </div>
              </div>
            ))}
            {days.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Belum ada transaksi</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
