'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogoutIcon } from './Icons'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/90 bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded-lg"
    >
      <LogoutIcon width={16} height={16} /> Keluar
    </button>
  )
}
