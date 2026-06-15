import type { SVGProps } from 'react'

const base = { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const WalletIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/><path d="M16 13h.01"/></svg>
)
export const CoinsIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="9" cy="9" r="5"/><path d="M14.5 5.5a5 5 0 0 1 0 9M9 7v4M7 9h4"/></svg>
)
export const TrendIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M3 17l6-6 4 4 7-7"/><path d="M16 8h5v5"/></svg>
)
export const StoreIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 9V7l1.5-3h13L20 7v2"/><path d="M4 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M5 9.5V20h14V9.5"/><path d="M9 20v-5h6v5"/></svg>
)
export const UsersIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5"/></svg>
)
export const MenuIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M5 8h11a3 3 0 0 1 0 6h-1"/><path d="M5 8v9a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-3"/><path d="M8 2v3M11 2v3"/></svg>
)
export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 5v14M5 12h14"/></svg>
)
export const ArrowLeftIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
)
export const ChevronRightIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M9 18l6-6-6-6"/></svg>
)
export const LogoutIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>
)
export const CoffeeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M5 8h12v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8z"/><path d="M17 9h2a2 2 0 0 1 0 5h-2"/><path d="M8 2v2M11 2v2M14 2v2"/></svg>
)
export const ReceiptIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>
)
