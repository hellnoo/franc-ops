import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import MenuManager from './MenuManager'
import PageHeader from '@/components/PageHeader'

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
    <div className="min-h-screen">
      <PageHeader title="Menu & HPP" subtitle="Kelola menu dan modal bahan" back="/owner" />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <MenuManager menu={menu || []} />
      </div>
    </div>
  )
}
