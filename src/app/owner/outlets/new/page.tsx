import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import OutletForm from './OutletForm'

export default async function NewOutletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner') redirect('/')

  const { data: mitra } = await supabase.from('profiles').select('id, full_name').eq('role', 'mitra')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-4" style={{ backgroundColor: '#7C1515' }}>
        <div className="max-w-md mx-auto flex items-center gap-3">
          <a href="/owner" className="text-red-200 hover:text-white">←</a>
          <h1 className="text-lg font-bold">Tambah Outlet</h1>
        </div>
      </header>
      <div className="max-w-md mx-auto px-4 py-6">
        <OutletForm mitra={mitra || []} />
      </div>
    </div>
  )
}
