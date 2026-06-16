'use client'

import { useEffect, useRef, useState } from 'react'
import { formatRupiah } from '@/lib/utils'

export default function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || value === 0) { setDisplay(value); return }

    const start = performance.now()
    const ease = (t: number) => 1 - Math.pow(1 - t, 3) // easeOutCubic

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(value * ease(t)))
      if (t < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [value, duration])

  return <>{formatRupiah(display)}</>
}
