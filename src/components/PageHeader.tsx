import { Link } from 'next-view-transitions'
import { ArrowLeftIcon } from './Icons'

export default function PageHeader({ title, subtitle, back, maxWidth = 'max-w-2xl', vtName, children }: {
  title: string
  subtitle?: string
  back?: string
  maxWidth?: string
  vtName?: string
  children?: React.ReactNode
}) {
  return (
    <header className="brand-header text-white px-4 py-5" style={vtName ? { viewTransitionName: vtName } : undefined}>
      <div className={`${maxWidth} mx-auto flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-3 min-w-0">
          {back && (
            <Link href={back} className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors shrink-0">
              <ArrowLeftIcon width={18} height={18} />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-[13px] text-white/70 truncate">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </header>
  )
}
