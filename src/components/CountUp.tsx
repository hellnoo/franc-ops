'use client'

import { useEffect, useRef, useState } from 'react'

export default function CountUp({ value, format, duration = 900 }: {
  value: number
  format: (n: number) => string
  duration?: number
}) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || value === 0) { setDisplay(value); return }

    const start = performance.now()
    const from = 0
    const ease = (t: number) => 1 - Math.pow(1 - t, 3) // easeOutCubic

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(from + (value - from) * ease(t)))
      if (t < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [value, duration])

  return <>{format(display)}</>
}
