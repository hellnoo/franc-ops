import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import MenuManager from './MenuManager'

export default async function MenuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner') redirect('/')

  const { data: menu } = await supabase
    .from('menu_items')
    .select('*')
    .eq('active', true)
    .order('category')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-4" style={{ backgroundColor: '#7C1515' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <a href="/owner" className="text-red-200 hover:text-white">←</a>
          <h1 className="text-lg font-bold">Menu &amp; HPP</h1>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <MenuManager menu={menu || []} />
      </div>
    </div>
  )
}
