import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import OutletForm from './OutletForm'
import PageHeader from '@/components/PageHeader'

export default async function NewOutletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner') redirect('/')

  const { data: mitra } = await supabase.from('profiles').select('id, full_name').eq('role', 'mitra')

  return (
    <div className="min-h-screen">
      <PageHeader title="Tambah Outlet" subtitle="Daftarkan outlet baru" back="/owner" maxWidth="max-w-md" />
      <div className="max-w-md mx-auto px-4 py-6">
        <OutletForm mitra={mitra || []} />
      </div>
    </div>
  )
}
