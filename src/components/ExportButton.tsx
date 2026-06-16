'use client'

interface Row { date: string; omzet: number; hpp: number; exp: number }

export default function ExportButton({ rows, filename }: { rows: Row[]; filename: string }) {
  function handleExport() {
    const header = ['Tanggal', 'Omzet', 'HPP', 'Biaya', 'Profit Bersih']
    const lines = rows.map(r => [r.date, r.omzet, r.hpp, r.exp, r.omzet - r.hpp - r.exp].join(','))
    const totalOmzet = rows.reduce((s, r) => s + r.omzet, 0)
    const totalHpp = rows.reduce((s, r) => s + r.hpp, 0)
    const totalExp = rows.reduce((s, r) => s + r.exp, 0)
    const footer = ['TOTAL', totalOmzet, totalHpp, totalExp, totalOmzet - totalHpp - totalExp].join(',')
    const csv = '﻿' + [header.join(','), ...lines, footer].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      disabled={rows.length === 0}
      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--foreground)] hover:bg-white/5 disabled:opacity-50"
    >
      Export CSV
    </button>
  )
}
