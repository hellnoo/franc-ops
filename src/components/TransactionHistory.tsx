import { formatRupiah, toWibDate } from '@/lib/utils'
import { ReceiptIcon } from './Icons'

interface TxItem { menu_name: string; price: number; hpp: number; qty: number }
interface Tx { id: string; total: number; created_at: string; transaction_items?: TxItem[] }

function wibTime(iso: string) {
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export default function TransactionHistory({ txs }: { txs: Tx[] }) {
  if (!txs || txs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <ReceiptIcon width={26} height={26} className="text-[var(--hallu)] mx-auto mb-2" />
        <p className="text-sm font-medium text-[var(--foreground)]">Belum ada transaksi</p>
        <p className="text-xs text-[var(--stone)] mt-1">Riwayat muncul setelah kasir input order</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {txs.map(tx => {
        const items = tx.transaction_items || []
        const itemCount = items.reduce((s, i) => s + i.qty, 0)
        return (
          <details key={tx.id} className="card overflow-hidden group">
            <summary className="p-3.5 flex items-center justify-between cursor-pointer list-none">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-[var(--hallu-50)] text-[var(--hallu)] flex items-center justify-center shrink-0">
                  <ReceiptIcon width={18} height={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{itemCount} item</p>
                  <p className="text-xs text-[var(--stone)]">
                    {new Date(toWibDate(tx.created_at)).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · {wibTime(tx.created_at)}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-[var(--foreground)] shrink-0">{formatRupiah(tx.total)}</p>
            </summary>
            <div className="px-3.5 pb-3.5 pt-0 border-t border-[var(--glass-border)] mt-0">
              {items.map((it, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-[var(--stone)]">{it.qty}× {it.menu_name}</span>
                  <span className="text-[var(--foreground)]">{formatRupiah(it.price * it.qty)}</span>
                </div>
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}
