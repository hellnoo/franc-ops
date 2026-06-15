import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import UserForm from './UserForm'

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
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-4" style={{ backgroundColor: '#7C1515' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <a href="/owner" className="text-red-200 hover:text-white">←</a>
          <h1 className="text-lg font-bold">Kelola User</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <UserForm outlets={outlets || []} />

        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Mitra ({mitra.length})</p>
          <div className="space-y-2">
            {mitra.map(u => (
              <div key={u.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
              </div>
            ))}
            {mitra.length === 0 && <p className="text-sm text-gray-400">Belum ada mitra</p>}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Kasir ({kasir.length})</p>
          <div className="space-y-2">
            {kasir.map(u => (
              <div key={u.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
              </div>
            ))}
            {kasir.length === 0 && <p className="text-sm text-gray-400">Belum ada kasir</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
