import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import UserForm from './UserForm'
import UserRow from './UserRow'
import PageHeader from '@/components/PageHeader'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner') redirect('/')

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: outlets } = await supabase.from('outlets').select('id, name').eq('active', true)
  const { data: assignments } = await supabase.from('outlet_kasir').select('outlet_id, kasir_id')
  const kasirOutlet: Record<string, string> = {}
  assignments?.forEach(a => { kasirOutlet[a.kasir_id] = a.outlet_id })

  const mitra = users?.filter(u => u.role === 'mitra') || []
  const kasir = users?.filter(u => u.role === 'kasir') || []

  return (
    <div className="min-h-screen">
      <PageHeader title="Kelola User" subtitle="Tambah & kelola mitra & kasir" back="/owner" />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <UserForm outlets={outlets || []} />

        <div>
          <p className="text-xs text-[var(--stone)] mb-2 font-semibold uppercase tracking-wide">Mitra ({mitra.length})</p>
          <div className="space-y-2">
            {mitra.map(u => <UserRow key={u.id} user={u} outlets={outlets || []} />)}
            {mitra.length === 0 && <p className="text-sm text-[var(--stone)]">Belum ada mitra</p>}
          </div>
        </div>

        <div>
          <p className="text-xs text-[var(--stone)] mb-2 font-semibold uppercase tracking-wide">Kasir ({kasir.length})</p>
          <div className="space-y-2">
            {kasir.map(u => <UserRow key={u.id} user={u} outlets={outlets || []} currentOutletId={kasirOutlet[u.id]} />)}
            {kasir.length === 0 && <p className="text-sm text-[var(--stone)]">Belum ada kasir</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
