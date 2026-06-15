import type { ReactNode } from 'react'
import { formatRupiah } from '@/lib/utils'

type Tone = 'emerald' | 'amber' | 'hallu'

const tones: Record<Tone, { bg: string; fg: string; value: string }> = {
  emerald: { bg: '#ecfdf5', fg: '#059669', value: '#1c1410' },
  amber: { bg: '#fff7ed', fg: '#ea580c', value: '#ea580c' },
  hallu: { bg: '#fdf3f3', fg: '#7C1515', value: '#7C1515' },
}

export default function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: Tone; icon: ReactNode }) {
  const t = tones[tone]
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-medium text-[var(--stone)]">{label}</span>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: t.bg, color: t.fg }}>
          {icon}
        </span>
      </div>
      <p className="text-lg font-bold tracking-tight" style={{ color: t.value }}>{formatRupiah(value)}</p>
    </div>
  )
}
