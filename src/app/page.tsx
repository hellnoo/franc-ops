import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  if (profile.role === 'owner') redirect('/owner')
  if (profile.role === 'mitra') redirect('/mitra')
  if (profile.role === 'kasir') redirect('/kasir')

  redirect('/login')
}
