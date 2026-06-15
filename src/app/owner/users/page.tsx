import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import UserForm from './UserForm'
import PageHeader from '@/components/PageHeader'
import { UsersIcon } from '@/components/Icons'

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

  const mitra = users?.filter(u => u.role === 'mitra') || []
  const kasir = users?.filter(u => u.role === 'kasir') || []

  return (
    <div className="min-h-screen">
      <PageHeader title="Kelola User" subtitle="Tambah mitra & kasir" back="/owner" />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <UserForm outlets={outlets || []} />

        <div>
          <p className="text-xs text-[var(--stone)] mb-2 font-semibold uppercase tracking-wide">Mitra ({mitra.length})</p>
          <div className="space-y-2">
            {mitra.map(u => (
              <div key={u.id} className="card p-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--hallu-50)] text-[var(--hallu)] flex items-center justify-center"><UsersIcon width={16} height={16} /></span>
                <p className="text-sm font-medium text-[var(--foreground)]">{u.full_name}</p>
              </div>
            ))}
            {mitra.length === 0 && <p className="text-sm text-[var(--stone)]">Belum ada mitra</p>}
          </div>
        </div>

        <div>
          <p className="text-xs text-[var(--stone)] mb-2 font-semibold uppercase tracking-wide">Kasir ({kasir.length})</p>
          <div className="space-y-2">
            {kasir.map(u => (
              <div key={u.id} className="card p-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--hallu-50)] text-[var(--hallu)] flex items-center justify-center"><UsersIcon width={16} height={16} /></span>
                <p className="text-sm font-medium text-[var(--foreground)]">{u.full_name}</p>
              </div>
            ))}
            {kasir.length === 0 && <p className="text-sm text-[var(--stone)]">Belum ada kasir</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
