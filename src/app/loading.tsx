import { Monogram } from '@/components/Brand'

export default function Loading() {
  return (
    <div className="loader-wrap min-h-screen flex flex-col items-center justify-center gap-6">
      <div className="relative w-24 h-24 loader-float">
        <div
          className="loader-glow absolute -inset-4 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,93,99,0.55) 0%, transparent 70%)', filter: 'blur(16px)' }}
        />
        <div
          className="loader-ring absolute inset-0 rounded-full"
          style={{ border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#ff5d63', borderRightColor: 'rgba(255,93,99,0.5)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Monogram className="w-9 h-9 text-white" />
        </div>
      </div>
      <p className="text-xs tracking-[0.35em] text-[var(--muted)]">MEMUAT</p>
    </div>
  )
}
