'use client'

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { PERIODS } from '@/lib/utils'

export default function PeriodFilter({ active }: { active: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  function setPeriod(key: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-1 p-1 rounded-xl bg-black/20 border border-[var(--glass-border)]">
      {PERIODS.map(p => (
        <button
          key={p.key}
          onClick={() => setPeriod(p.key)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${active === p.key ? 'btn-brand' : 'text-[var(--stone)] hover:text-[var(--foreground)]'}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
