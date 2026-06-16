import type { ReactNode } from 'react'
import { formatRupiah } from '@/lib/utils'

type Tone = 'emerald' | 'amber' | 'hallu'

const tones: Record<Tone, { color: string; glow: string }> = {
  emerald: { color: '#34d399', glow: 'rgba(52, 211, 153, 0.45)' },
  amber: { color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.45)' },
  hallu: { color: '#ff5d63', glow: 'rgba(255, 93, 99, 0.5)' },
}

export default function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: Tone; icon: ReactNode }) {
  const t = tones[tone]
  return (
    <div className="card p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            color: t.color,
            background: `radial-gradient(circle at 30% 30%, ${t.glow} 0%, rgba(255,255,255,0.04) 70%)`,
            boxShadow: `0 0 16px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
          }}
        >
          {icon}
        </span>
      </div>
      <p className="text-lg font-bold tracking-tight tabular-nums" style={{ color: '#fff', textShadow: `0 0 18px ${t.glow}` }}>
        {formatRupiah(value)}
      </p>
    </div>
  )
}
