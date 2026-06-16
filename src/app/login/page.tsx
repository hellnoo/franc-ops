'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Brand'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email atau password salah')
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top brand panel */}
      <div className="brand-header text-white px-6 pt-16 pb-24 text-center">
        <Logo className="h-14 w-auto mx-auto text-white" />
        <p className="text-[11px] tracking-[0.4em] text-white/60 mt-3">FRANC-OPS</p>
        <p className="text-sm text-white/70 mt-3">Pantau outlet franchise kamu, di mana saja</p>
      </div>

      {/* Card overlapping */}
      <div className="relative z-10 flex-1 px-5 -mt-14">
        <div className="w-full max-w-sm mx-auto card p-6">
          <h2 className="text-base font-bold text-[var(--foreground)] mb-1">Masuk</h2>
          <p className="text-[13px] text-[var(--stone)] mb-5">Gunakan akun yang terdaftar</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--foreground)] mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required className="input-field" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--foreground)] mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="input-field" />
            </div>
            {error && (
              <div className="text-[13px] text-[var(--hallu)] bg-[var(--hallu-50)] rounded-lg px-3 py-2">{error}</div>
            )}
            <button type="submit" disabled={loading} className="btn-brand w-full py-3 rounded-xl text-sm font-semibold">
              {loading ? 'Memproses…' : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--stone)] mt-6 pb-8">© Hallu Coffee · Franchise Operations</p>
      </div>
    </div>
  )
}
