import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import ExpenseManager from './ExpenseManager'
import type { Expense } from '@/types'

export default async function PengeluaranPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Outlet yang bisa diakses sesuai role
  let outlets: { id: string; name: string }[] = []
  if (profile.role === 'owner') {
    const { data } = await supabase.from('outlets').select('id, name').eq('active', true)
    outlets = data || []
  } else if (profile.role === 'mitra') {
    const { data } = await supabase.from('outlets').select('id, name').eq('mitra_id', user.id).eq('active', true)
    outlets = data || []
  } else {
    const { data } = await supabase.from('outlet_kasir').select('outlets(id, name)').eq('kasir_id', user.id)
    outlets = (data || []).map(d => d.outlets as unknown as { id: string; name: string }).filter(Boolean)
  }

  const outletIds = outlets.map(o => o.id)
  const since = new Date(); since.setDate(since.getDate() - 30)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .in('outlet_id', outletIds.length ? outletIds : ['00000000-0000-0000-0000-000000000000'])
    .gte('expense_date', since.toISOString().split('T')[0])
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  const backHref = profile.role === 'owner' ? '/owner' : profile.role === 'mitra' ? '/mitra' : '/kasir'

  return (
    <div className="min-h-screen">
      <PageHeader title="Pengeluaran" subtitle="Catat biaya operasional outlet" back={backHref} />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ExpenseManager
          outlets={outlets}
          expenses={(expenses || []) as Expense[]}
          outletNames={Object.fromEntries(outlets.map(o => [o.id, o.name]))}
        />
      </div>
    </div>
  )
}
