export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

// ===== Periode (zona WIB / UTC+7) =====
const WIB_MS = 7 * 60 * 60 * 1000
const pad = (n: number) => String(n).padStart(2, '0')

export type PeriodKey = 'today' | '7d' | '30d' | 'month'
export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Hari ini' },
  { key: '7d', label: '7 Hari' },
  { key: '30d', label: '30 Hari' },
  { key: 'month', label: 'Bulan ini' },
]

/** Tanggal kalender WIB dari sebuah timestamp (YYYY-MM-DD). */
export function toWibDate(input: string | number | Date): string {
  const d = new Date(new Date(input).getTime() + WIB_MS)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function getPeriodRange(period: string | undefined, fallback: PeriodKey = 'today') {
  const key = PERIODS.find(p => p.key === period)?.key ?? fallback
  const now = new Date(Date.now() + WIB_MS) // wall-clock WIB via UTC getters
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), day = now.getUTCDate()

  let s: Date
  if (key === 'today') s = new Date(Date.UTC(y, m, day))
  else if (key === 'month') s = new Date(Date.UTC(y, m, 1))
  else if (key === '7d') s = new Date(Date.UTC(y, m, day - 6))
  else s = new Date(Date.UTC(y, m, day - 29))

  const sinceDate = `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`
  const label = PERIODS.find(p => p.key === key)!.label
  return { key, label, sinceDate, sinceISO: `${sinceDate}T00:00:00+07:00` }
}
