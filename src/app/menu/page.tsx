'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { subscribePush, sendPush } from '@/lib/push'
import type { MenuItem, StoreSettings } from '@/types'

const CATEGORIES = ['Kopi', 'Non-Kopi', 'Makanan', 'Lainnya']

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

const CAT_ICONS: Record<string, string> = {
  'Kopi': '☕', 'Non-Kopi': '🥤', 'Makanan': '🍽️', 'Lainnya': '✨',
}

function generatePlaceholder(item: MenuItem): string {
  const icon = CAT_ICONS[item.category] || '☕'
  const name = item.name.length > 18 ? item.name.slice(0, 17) + '…' : item.name
  // escape karakter XML agar SVG valid
  const safeName = name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7C1515"/>
        <stop offset="100%" stop-color="#2D0808"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="45%" r="45%">
        <stop offset="0%" stop-color="#A02020" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
    </defs>
    <rect width="400" height="200" fill="url(#g)"/>
    <rect width="400" height="200" fill="url(#glow)"/>
    <text x="200" y="92" text-anchor="middle" font-size="54" opacity="0.9">${icon}</text>
    <text x="200" y="138" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17" font-weight="700" fill="rgba(255,255,255,0.88)">${safeName}</text>
    <text x="200" y="178" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="rgba(212,184,150,0.45)" letter-spacing="5">HALL-U</text>
  </svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

const IMG_ANIMATIONS = [
  'animate-kenburns',
  'animate-float-zoom',
  'animate-drift',
  'animate-tilt3d',
]
function pickAnim(id: string) {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return IMG_ANIMATIONS[hash % IMG_ANIMATIONS.length]
}
function leakDelay(id: string) {
  return -((id.charCodeAt(0) % 10) * 1.1)
}

// ── Per-category atmosphere ────────────────────────────────
const CAT_ATM: Record<string, { bg: string; glow: string; accent: string; ring: string }> = {
  'Kopi':     { bg: 'radial-gradient(ellipse at 50% 25%, #3D1A00 0%, #1C0900 45%, #080300 100%)', glow: 'rgba(212,129,58,0.55)', accent: '#D4813A', ring: '#7C3A10' },
  'Non-Kopi': { bg: 'radial-gradient(ellipse at 50% 25%, #003D3A 0%, #001A18 45%, #000806 100%)', glow: 'rgba(52,211,153,0.5)',  accent: '#34D399', ring: '#065F46' },
  'Makanan':  { bg: 'radial-gradient(ellipse at 50% 25%, #3D2500 0%, #1A1000 45%, #080500 100%)', glow: 'rgba(251,146,60,0.5)',  accent: '#FB923C', ring: '#7C3100' },
  'Lainnya':  { bg: 'radial-gradient(ellipse at 50% 25%, #2A003D 0%, #12001A 45%, #060008 100%)', glow: 'rgba(167,139,250,0.5)', accent: '#A78BFA', ring: '#4C1D95' },
}
const DEFAULT_ATM = CAT_ATM['Kopi']

// Deterministic bokeh particles (no random — consistent across renders)
const BOKEH = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37 + 11) % 86 + 7}%`,
  top:  `${(i * 53 + 7)  % 75 + 10}%`,
  size: ((i * 17 + 5) % 14) + 5,
  delay: `${-((i * 0.8) % 6)}s`,
  dur:   `${((i * 1.4) % 5) + 5}s`,
  opacity: 0.08 + (i % 6) * 0.04,
}))

// ── AI Chatbot Widget ──────────────────────────────────────
function ChatbotWidget({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Halo Kak! ☕ Aku barista AI Hall-U. Mau rekomendasi menu? Tanya aja, atau pilih cepat di bawah 👇' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    const userText = text.trim(); if (!userText || loading) return
    setInput('')
    const newMessages = [...messages, { role: 'user' as const, content: userText }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          menu: items.map(i => ({ name: i.name, category: i.category, price: i.price, description: i.description }))
        })
      })
      const json = await res.json()
      const reply = json.reply || json.error || 'Maaf, aku error nih. Coba lagi ya.'
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Koneksi error. Coba lagi ya Kak 🙏' }])
    } finally {
      setLoading(false)
    }
  }

  const quickPrompts = [
    'Rekomen yang manis & dingin',
    'Buat sore santai',
    'Kopi yang ga pahit',
    'Cocok buat ngantuk',
  ]

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-h-red to-h-red-d flex items-center justify-center shadow-2xl active:scale-90 transition-all"
          style={{ boxShadow: '0 8px 30px rgba(230,51,41,0.45)' }}
          aria-label="Chat barista">
          <span className="text-2xl">💬</span>
          <span className="absolute -top-1 -right-1 bg-white text-h-red text-[8px] font-black px-1.5 py-0.5 rounded-full">AI</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center pointer-events-none">
          <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-[440px] bg-h-dark border border-h-border sm:rounded-2xl rounded-t-3xl flex flex-col pointer-events-auto"
            style={{ height: '80vh', maxHeight: '600px' }}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-h-border flex items-center justify-between bg-gradient-to-r from-h-red/20 to-transparent sm:rounded-t-2xl rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-h-red flex items-center justify-center text-lg">🤖</div>
                <div>
                  <div className="font-black text-white text-sm">Barista AI</div>
                  <div className="text-[10px] text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Online</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-h-muted hover:text-white text-2xl leading-none">×</button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-h-red text-white rounded-br-md'
                      : 'bg-h-card border border-h-border text-white/90 rounded-bl-md'
                  }`}>
                    {m.content.split('\n').map((line, j) => (
                      <div key={j}>{line.replace(/\*([^*]+)\*/g, '$1')}</div>
                    ))}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-h-card border border-h-border rounded-2xl rounded-bl-md px-4 py-2.5 flex gap-1">
                    {[0, 0.15, 0.3].map(d => (
                      <span key={d} className="w-1.5 h-1.5 bg-h-muted rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick prompts */}
            {messages.length <= 2 && !loading && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
                {quickPrompts.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="flex-shrink-0 text-xs text-h-red border border-h-red/30 hover:bg-h-red/10 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap font-bold">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={e => { e.preventDefault(); send(input) }}
              className="border-t border-h-border p-3 flex gap-2">
              <input
                value={input} onChange={e => setInput(e.target.value)}
                placeholder="Tanya barista..."
                disabled={loading}
                className="flex-1 bg-h-card border border-h-border rounded-full px-4 py-2.5 text-sm text-white placeholder-h-muted focus:outline-none focus:border-h-red transition-colors" />
              <button type="submit" disabled={loading || !input.trim()}
                className="w-11 h-11 rounded-full bg-h-red hover:bg-h-red-d disabled:opacity-40 flex items-center justify-center text-white transition-colors flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── Product Showcase Modal ─────────────────────────────────
function ShowcaseModal({ item, qty, onAdd, onRemove, onClose }: {
  item: MenuItem; qty: number
  onAdd: () => void; onRemove: () => void; onClose: () => void
}) {
  const atm = CAT_ATM[item.category] || DEFAULT_ATM
  const imgSrc = item.image_url || generatePlaceholder(item)
  const [imgTilt, setImgTilt] = useState({ x: 0, y: 0 })
  const imgWrapRef = useRef<HTMLDivElement>(null)

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleImgMove = (e: React.MouseEvent | React.TouchEvent) => {
    const wrap = imgWrapRef.current; if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const x = (clientX - rect.left) / rect.width  - 0.5
    const y = (clientY - rect.top)  / rect.height - 0.5
    setImgTilt({ x: x * 18, y: -y * 18 })
  }
  const resetTilt = () => setImgTilt({ x: 0, y: 0 })

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden" onClick={onClose}>
      {/* Atmospheric background */}
      <div className="absolute inset-0 transition-all duration-700" style={{ background: atm.bg }} />

      {/* Bokeh particles */}
      {BOKEH.map((p, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none"
          style={{
            left: p.left, top: p.top,
            width: p.size, height: p.size,
            background: atm.accent,
            opacity: p.opacity,
            filter: `blur(${Math.ceil(p.size / 3)}px)`,
            animation: `float-zoom ${p.dur} ease-in-out infinite`,
            animationDelay: p.delay,
          }} />
      ))}

      {/* Ambient center glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-80 h-80 rounded-full blur-3xl opacity-30 animate-hero-glow"
          style={{ background: atm.glow }} />
      </div>

      {/* Close button */}
      <button onClick={onClose}
        className="absolute top-4 left-4 z-20 flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current strokeWidth-2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Menu
      </button>

      {/* Category badge */}
      <div className="absolute top-4 right-4 z-20">
        <span className="text-[10px] font-black uppercase tracking-[3px] px-3 py-1.5 rounded-full border"
          style={{ color: atm.accent, borderColor: atm.ring, background: 'rgba(0,0,0,0.4)' }}>
          {CAT_ICONS[item.category]} {item.category}
        </span>
      </div>

      {/* 3D Product image */}
      <div className="flex-1 flex items-center justify-center relative z-10 pt-16 pb-4"
        onClick={e => e.stopPropagation()}>
        <div ref={imgWrapRef}
          onMouseMove={handleImgMove} onMouseLeave={resetTilt}
          onTouchMove={handleImgMove} onTouchEnd={resetTilt}
          style={{ perspective: '900px', cursor: 'grab' }}>
          <div style={{
            transform: `rotateY(${imgTilt.x}deg) rotateX(${imgTilt.y}deg) translateZ(0)`,
            transition: imgTilt.x === 0 ? 'transform 0.6s ease' : 'transform 0.08s ease',
            transformStyle: 'preserve-3d',
          }}>
            {/* Main image */}
            <img src={imgSrc} alt={item.name}
              className="w-64 h-64 sm:w-72 sm:h-72 object-cover rounded-3xl"
              style={{
                filter: `drop-shadow(0 0 35px ${atm.glow}) drop-shadow(0 20px 40px rgba(0,0,0,0.7))`,
                animation: 'float-zoom 7s ease-in-out infinite',
              }} />
            {/* Glass sheen */}
            <div className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 40%, transparent 70%)' }} />
            {/* Floor reflection */}
            <div className="absolute top-full left-0 right-0 h-16 rounded-b-3xl pointer-events-none"
              style={{
                background: `linear-gradient(180deg, ${atm.glow} 0%, transparent 100%)`,
                opacity: 0.25,
                transform: 'scaleY(-0.4) translateY(-2px)',
                filter: 'blur(6px)',
              }} />
          </div>
        </div>
      </div>

      {/* Info panel — glassmorphism */}
      <div className="relative z-10 rounded-t-3xl px-6 pt-6 pb-10"
        onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(24px)', borderTop: `1px solid ${atm.ring}` }}>
        <div className="text-xs font-black uppercase tracking-[4px] mb-1.5" style={{ color: atm.accent }}>
          {formatRp(item.price)}
        </div>
        <h2 className="font-sans font-black text-white text-2xl leading-tight mb-2">{item.name}</h2>
        {item.description && (
          <p className="text-white/50 text-sm leading-relaxed mb-5">{item.description}</p>
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            {qty > 0 && (
              <div className="text-xs text-white/40 font-bold">{qty}× di keranjang · {formatRp(item.price * qty)}</div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {qty > 0 && (
              <>
                <button onClick={onRemove}
                  className="w-11 h-11 rounded-full border flex items-center justify-center text-white font-bold text-xl leading-none transition-all active:scale-90"
                  style={{ borderColor: atm.ring }}>
                  −
                </button>
                <span className="font-black text-white text-lg w-5 text-center">{qty}</span>
              </>
            )}
            <button onClick={onAdd}
              className="h-11 px-6 rounded-full font-black text-sm uppercase tracking-wider text-white transition-all active:scale-90"
              style={{ background: atm.accent === '#D4813A' ? '#e63329' : atm.accent, color: '#fff' }}>
              {qty === 0 ? '+ Tambah' : '+'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ItemCard({
  item, qty, onAdd, onRemove, index = 0, onShowcase,
}: {
  item: MenuItem; qty: number; onAdd: () => void; onRemove: () => void; index?: number; onShowcase: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [visible, setVisible] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const imgSrc = item.image_url || generatePlaceholder(item)
  const atm = CAT_ATM[item.category] || DEFAULT_ATM

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect(); if (!rect) return
    const x = (e.clientX - rect.left) / rect.width  - 0.5
    const y = (e.clientY - rect.top)  / rect.height - 0.5
    setTilt({ x: x * 8, y: -y * 8 })
  }
  const resetTilt = () => setTilt({ x: 0, y: 0 })

  // Entrance cascade — fade + slide up saat masuk viewport
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.06 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Scroll parallax — geser object-position, tidak ganggu CSS transform animation
  useEffect(() => {
    const el = cardRef.current
    const img = imgRef.current
    if (!el || !img) return
    const onScroll = () => {
      const rect = el.getBoundingClientRect()
      const progress = (window.innerHeight / 2 - rect.top - rect.height / 2) / (window.innerHeight + rect.height)
      img.style.objectPosition = `center ${50 + progress * 18}%`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="bg-h-card border border-h-border rounded-2xl overflow-hidden cursor-pointer"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? `perspective(700px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) translateY(0)`
          : 'translateY(22px)',
        transition: tilt.x !== 0
          ? 'opacity 0.5s ease, transform 0.09s ease'
          : `opacity 0.5s ease ${index * 65}ms, transform 0.55s ease ${index * 65}ms`,
        boxShadow: tilt.x !== 0 ? `0 12px 40px ${atm.glow}` : undefined,
      }}
    >
      {/* Photo — tap to open showcase */}
      <div
        onClick={onShowcase}
        className="relative h-40 overflow-hidden shine-overlay light-leak"
        style={{ '--leak-delay': `${leakDelay(item.id)}s` } as React.CSSProperties}
      >
        <img
          ref={imgRef}
          src={imgSrc}
          alt={item.name}
          className={`w-full h-full object-cover ${pickAnim(item.id)}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-h-card via-h-card/10 to-transparent" />
        {/* Category color accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: atm.accent, opacity: 0.7 }} />
        <div className="absolute bottom-2.5 right-3 bg-black/60 backdrop-blur-sm text-h-red font-black text-sm px-2.5 py-1 rounded-lg">
          {formatRp(item.price)}
        </div>
        {/* Showcase hint */}
        <div className="absolute top-2.5 left-3 text-white/40 text-[9px] font-bold uppercase tracking-widest">
          Tap untuk detail
        </div>
      </div>
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0" onClick={onShowcase}>
          <div className="font-semibold text-white text-[0.92rem]">{item.name}</div>
          {item.description && (
            <div className="text-h-muted text-xs mt-0.5 leading-relaxed line-clamp-2">
              {item.description}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          {qty > 0 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); onRemove() }}
                className="w-8 h-8 rounded-full border border-h-border flex items-center justify-center text-white font-bold text-lg leading-none hover:border-white/40 transition-colors active:scale-90"
              >−</button>
              <span className="w-5 text-center font-bold text-white text-sm">{qty}</span>
            </>
          )}
          <button
            onClick={e => { e.stopPropagation(); onAdd() }}
            className="w-8 h-8 rounded-full bg-h-red hover:bg-h-red-d flex items-center justify-center text-white font-bold text-lg leading-none transition-all active:scale-90"
          >+</button>
        </div>
      </div>
    </div>
  )
}

// ── Store open/closed ──────────────────────────────────────
function calcIsOpen(s: StoreSettings): boolean {
  if (s.is_manually_closed) return false
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = s.open_time.split(':').map(Number)
  const [ch, cm] = s.close_time.split(':').map(Number)
  return cur >= oh * 60 + om && cur < ch * 60 + cm
}

// ── Order persistence helpers ──────────────────────────────
const ORDER_KEY = (table: string) => `hallu-order-${table}`
const ORDER_EXPIRY = 3 * 60 * 60 * 1000 // 3 jam

function saveActiveOrder(table: string, id: string) {
  localStorage.setItem(ORDER_KEY(table), JSON.stringify({ id, createdAt: Date.now() }))
}
function clearActiveOrder(table: string) {
  localStorage.removeItem(ORDER_KEY(table))
}
function getActiveOrderId(table: string): string | null {
  try {
    const raw = localStorage.getItem(ORDER_KEY(table))
    if (!raw) return null
    const { id, createdAt } = JSON.parse(raw)
    if (Date.now() - createdAt > ORDER_EXPIRY) { clearActiveOrder(table); return null }
    return id
  } catch { return null }
}

function MenuContent() {
  const params = useSearchParams()
  const tableNum = params.get('table') || '1'
  const tableName = params.get('name') || `Meja ${tableNum}`

  const [items, setItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [payMethod, setPayMethod] = useState<'tunai' | 'qris' | ''>('')
  const [note, setNote] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderStatus, setOrderStatus] = useState<string>('new')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [restoring, setRestoring] = useState(true)
  const [rating, setRating] = useState(0)
  const [ratingHover, setRatingHover] = useState(0)
  const [rated, setRated] = useState(false)
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null)
  const [showcase, setShowcase] = useState<MenuItem | null>(null)
  const [aiRecs, setAiRecs] = useState<{ id: string; reason: string }[]>([])
  const [aiRecsLoading, setAiRecsLoading] = useState(false)

  // ── Restore active order saat mount / refresh ──────────────
  useEffect(() => {
    const savedId = getActiveOrderId(tableNum)
    if (!savedId) { setRestoring(false); return }

    // Fetch status terkini dari DB (bukan cuma trust localStorage)
    supabase.from('orders').select('status').eq('id', savedId).single()
      .then(({ data }) => {
        if (!data || data.status === 'done' || data.status === 'cancelled') {
          clearActiveOrder(tableNum)
        } else {
          setOrderId(savedId)
          setOrderStatus(data.status)
          setSubmitted(true)
        }
        setRestoring(false)
      })
  }, [tableNum]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cart persistence — simpan & load dari localStorage per meja
  useEffect(() => {
    const saved = localStorage.getItem(`hallu-cart-${tableNum}`)
    if (saved) try { setCart(JSON.parse(saved)) } catch { /* ignore */ }
  }, [tableNum])
  useEffect(() => {
    if (Object.keys(cart).length > 0) localStorage.setItem(`hallu-cart-${tableNum}`, JSON.stringify(cart))
    else localStorage.removeItem(`hallu-cart-${tableNum}`)
  }, [cart, tableNum])

  useEffect(() => {
    supabase.from('menu_items').select('*').eq('available', true).order('name')
      .then(({ data }) => { if (data) setItems(data); setLoading(false) })
    supabase.from('store_settings').select('*').eq('id', 1).single()
      .then(({ data }) => { if (data) setStoreSettings(data as StoreSettings) })
  }, [])

  // IntersectionObserver — update active tab saat scroll
  useEffect(() => {
    if (loading) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveCategory(e.target.getAttribute('data-cat') || '') })
    }, { rootMargin: '-15% 0px -75% 0px' })
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [loading])

  const addItem = (id: string) => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const removeItem = (id: string) => setCart(c => {
    const next = (c[id] || 0) - 1
    if (next <= 0) { const { [id]: _, ...rest } = c; return rest } // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...c, [id]: next }
  })

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)
  const totalPrice = items.filter(i => cart[i.id]).reduce((s, i) => s + i.price * cart[i.id], 0)

  const scrollToCategory = (cat: string) => {
    setActiveCategory(cat)
    sectionRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const grouped = CATEGORIES.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    const catItems = items.filter(i => i.category === cat)
    if (catItems.length) acc[cat] = catItems
    return acc
  }, {})

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const orderItems = items.filter(i => cart[i.id]).map(i => ({ id: i.id, name: i.name, price: i.price, qty: cart[i.id] }))
      const { data, error } = await supabase.from('orders').insert({ table_number: parseInt(tableNum), items: orderItems, note: note.trim() || null, customer_name: customerName.trim() || null, phone: phone.trim() || null, payment_method: payMethod || null }).select('id').single()
      if (error) throw error
      setOrderId(data.id)
      setOrderStatus('new')
      setSubmitted(true)
      saveActiveOrder(tableNum, data.id) // ← persist biar tidak hilang kalau refresh
      // Notif ke kasir (walau page kasir tutup)
      sendPush('kasir', {
        title: '🔔 Order Baru!',
        body: `${tableName}${customerName ? ` — ${customerName}` : ''}`,
        url: '/kasir',
        tag: 'new-order'
      })
      // Subscribe customer untuk notif pesanan siap
      subscribePush('customer', data.id)
    } catch {
      setSubmitError('Gagal mengirim pesanan. Periksa koneksi lalu coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  // Fetch AI recommendations saat cart dibuka & ada item
  useEffect(() => {
    if (!showCart || Object.keys(cart).length === 0) { setAiRecs([]); return }
    let cancelled = false
    setAiRecsLoading(true)
    const cartItems = items.filter(i => cart[i.id]).map(i => ({
      name: i.name, category: i.category, price: i.price, qty: cart[i.id]
    }))
    const menuList = items.map(i => ({
      id: i.id, name: i.name, category: i.category, price: i.price, description: i.description
    }))
    fetch('/api/ai/recommend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: cartItems, menu: menuList })
    })
      .then(r => r.json())
      .then(json => { if (!cancelled) setAiRecs(json.recommendations || []) })
      .catch(() => { if (!cancelled) setAiRecs([]) })
      .finally(() => { if (!cancelled) setAiRecsLoading(false) })
    return () => { cancelled = true }
  }, [showCart]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: listen for status changes on submitted order
  useEffect(() => {
    if (!orderId) return
    const ch = supabase.channel(`order-status-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, payload => {
        const newStatus = payload.new.status
        setOrderStatus(newStatus)
        // Bersihkan localStorage kalau order sudah selesai / dibatalkan
        if (newStatus === 'done' || newStatus === 'cancelled') {
          clearActiveOrder(tableNum)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [orderId, tableNum])

  // Saat restore order dari localStorage — jangan tampilkan menu dulu
  if (restoring) return (
    <div className="min-h-screen bg-h-bg flex items-center justify-center">
      <div className="text-center">
        <div className="font-sans font-black text-white tracking-widest text-xl uppercase mb-2">HALL-U</div>
        <div className="text-h-muted text-xs animate-pulse">Memuat...</div>
      </div>
    </div>
  )

  if (submitted) {
    const isPreparing = orderStatus === 'preparing'
    const isReady = orderStatus === 'ready'
    const isDone = orderStatus === 'done'
    const isCancelled = orderStatus === 'cancelled'

    return (
      <div className="min-h-screen bg-h-bg flex flex-col items-center justify-center text-center px-8">
        {isCancelled ? (
          <>
            <div className="w-20 h-20 rounded-full border-2 border-h-border flex items-center justify-center mb-5">
              <span className="text-4xl">✕</span>
            </div>
            <h1 className="font-sans text-2xl font-black text-white uppercase tracking-wider mb-1">Dibatalkan</h1>
            <p className="text-h-muted text-xs mt-3 max-w-xs">Pesananmu dibatalkan oleh kasir. Silakan order ulang atau tanya langsung ke kasir.</p>
          </>
        ) : isReady ? (
          <>
            <div className="w-24 h-24 rounded-full bg-h-red/10 border-2 border-h-red flex items-center justify-center mb-5 animate-pulse">
              <span className="text-5xl">🔔</span>
            </div>
            <h1 className="font-sans text-2xl font-black text-white uppercase tracking-wider mb-1">Pesanan Siap!</h1>
            <p className="text-h-red text-sm font-bold">{tableName}</p>
            <p className="text-white/70 text-sm mt-3 max-w-xs leading-relaxed">Silakan ke kasir untuk ambil pesananmu dan konfirmasi pembayaran.</p>
          </>
        ) : isDone ? (
          <>
            <div className="w-20 h-20 rounded-full border-2 border-h-red flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-h-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-sans text-2xl font-black text-white uppercase tracking-wider mb-1">Selesai!</h1>
            <p className="text-h-muted text-xs mt-3 max-w-xs">Terima kasih sudah mampir ke Hall-U ☕</p>
            {/* Rating */}
            {!rated ? (
              <div className="mt-8 bg-h-card border border-h-border rounded-2xl px-8 py-6 text-center max-w-xs w-full">
                <p className="text-white text-sm font-bold mb-1">Gimana pesanannya?</p>
                <p className="text-h-muted text-xs mb-4">Tap bintang buat kasih rating</p>
                <div className="flex justify-center gap-2 mb-2">
                  {[1,2,3,4,5].map(s => (
                    <button key={s}
                      onMouseEnter={() => setRatingHover(s)}
                      onMouseLeave={() => setRatingHover(0)}
                      onClick={async () => {
                        setRating(s); setRated(true)
                        if (orderId) await supabase.from('orders').update({ rating: s }).eq('id', orderId)
                      }}
                      className="text-3xl transition-transform active:scale-90 hover:scale-110">
                      {s <= (ratingHover || rating) ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center">
                <div className="text-2xl mb-1">{'⭐'.repeat(rating)}</div>
                <p className="text-h-muted text-xs">Makasih feedbacknya! 🙏</p>
              </div>
            )}
          </>
        ) : isPreparing ? (
          <>
            <div className="w-20 h-20 rounded-full border-2 border-yellow-500 flex items-center justify-center mb-5">
              <span className="text-4xl">👨‍🍳</span>
            </div>
            <h1 className="font-sans text-2xl font-black text-white uppercase tracking-wider mb-1">Sedang Disiapkan</h1>
            <p className="text-yellow-400 text-sm font-semibold">{tableName}</p>
            <p className="text-h-muted text-xs mt-3 max-w-xs leading-relaxed">Pesananmu sedang dibuat oleh barista kami. Sebentar lagi siap! ☕</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full border-2 border-h-border flex items-center justify-center mb-5">
              <span className="text-4xl animate-spin" style={{ animationDuration: '3s' }}>⏳</span>
            </div>
            <h1 className="font-sans text-2xl font-black text-white uppercase tracking-wider mb-1">Pesanan Diterima!</h1>
            <p className="text-h-red text-sm font-semibold">{tableName}</p>
            <p className="text-h-muted text-xs mt-3 max-w-xs leading-relaxed">Pesananmu sedang diproses. Halaman ini otomatis update saat pesanan siap — tetap buka ya!</p>
          </>
        )}

        {/* Steps indicator */}
        <div className="mt-8 flex items-center gap-2 max-w-xs w-full justify-center">
          {[['Diterima', true], ['Disiapkan', isPreparing || isReady || isDone], ['Siap Diambil', isReady || isDone]].map(([label, done], i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-colors ${done ? 'bg-h-red text-white' : 'bg-h-border text-h-muted'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className="text-[9px] text-h-muted whitespace-nowrap">{label as string}</span>
              </div>
              {i < arr.length - 1 && <div className={`w-8 h-px mb-4 transition-colors ${done ? 'bg-h-red' : 'bg-h-border'}`} />}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          {/* Kembali ke menu — selalu tersedia kecuali done/cancelled */}
          {!isDone && !isCancelled && (
            <button
              onClick={() => setSubmitted(false)}
              className="text-h-muted hover:text-white text-xs font-bold uppercase tracking-wider border border-h-border hover:border-white/30 px-6 py-2.5 rounded-full transition-colors"
            >← Kembali ke Menu</button>
          )}
          {/* Pesan lagi — hanya saat done/cancelled */}
          {(isCancelled || isDone) && (
            <button
              onClick={() => { setCart({}); setNote(''); setCustomerName(''); setPhone(''); setPayMethod(''); setSubmitted(false); setOrderId(null); clearActiveOrder(tableNum); localStorage.removeItem(`hallu-cart-${tableNum}`) }}
              className="bg-h-red hover:bg-h-red-d text-white px-7 py-3 rounded-full font-semibold transition-colors text-sm"
            >Pesan Lagi</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-h-bg">
      <header className={`bg-h-dark border-b border-h-border sticky z-40 ${orderId && !submitted ? 'top-[42px]' : 'top-0'}`}>
        <div className="max-w-[480px] mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <div className="font-sans text-lg font-black text-white tracking-widest uppercase leading-none">HALL-U</div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="text-h-red text-[0.5rem] tracking-[3px] uppercase font-semibold">Coffee &amp; Sociality</div>
              {storeSettings && (() => {
                const open = calcIsOpen(storeSettings)
                return (
                  <span className={`text-[0.5rem] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${open ? 'bg-green-500/20 text-green-400' : 'bg-h-red/20 text-h-red'}`}>
                    {open ? '● Buka' : '● Tutup'}
                  </span>
                )
              })()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {storeSettings && !calcIsOpen(storeSettings) && (
              <div className="text-[0.6rem] text-h-muted border border-h-border rounded px-2 py-1 whitespace-nowrap">
                Buka {storeSettings.open_time}
              </div>
            )}
            <div className="border border-h-red text-h-red rounded px-3 py-1 text-xs font-bold tracking-wider uppercase">
              {tableName}
            </div>
          </div>
        </div>
        {/* Sticky category tabs */}
        {!loading && Object.keys(grouped).length > 0 && (
          <div className="max-w-[480px] mx-auto flex overflow-x-auto scrollbar-hide border-t border-h-border/50 px-2">
            {Object.keys(grouped).map(cat => (
              <button key={cat} onClick={() => scrollToCategory(cat)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeCategory === cat ? 'text-h-red border-h-red' : 'text-h-muted border-transparent hover:text-white'}`}>
                <span>{CAT_ICONS[cat]}</span>{cat}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-[480px] mx-auto px-4 pt-5 pb-32">
        {loading ? (
          <div className="flex items-center justify-center pt-20 text-h-muted text-sm">Memuat menu...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center pt-20 text-h-muted text-sm">Menu belum tersedia</div>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <section key={cat} className="mb-7" data-cat={cat}
              ref={el => { sectionRefs.current[cat] = el }}>
              <h2 className="text-sm font-bold text-white mb-3 px-1 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-1 h-4 bg-h-red rounded-full inline-block" />
                {CAT_ICONS[cat]} {cat}
              </h2>
              <div className="space-y-3">
                {catItems.map((item, i) => (
                  <ItemCard key={item.id} item={item} qty={cart[item.id] || 0} index={i}
                    onAdd={() => addItem(item.id)} onRemove={() => removeItem(item.id)}
                    onShowcase={() => setShowcase(item)} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* AI Chatbot — floating */}
      {!loading && items.length > 0 && !submitted && <ChatbotWidget items={items} />}

      {/* Sticky order status bar — muncul saat ada order aktif */}
      {orderId && !submitted && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <button
            onClick={() => setSubmitted(true)}
            className={`w-full max-w-[480px] mx-auto flex items-center justify-between px-5 py-3 text-xs font-bold transition-colors
              ${orderStatus === 'ready' ? 'bg-green-600 animate-pulse' :
                orderStatus === 'preparing' ? 'bg-yellow-600' :
                'bg-h-red'}`}>
            <span className="flex items-center gap-2">
              {orderStatus === 'ready' ? '🔔 Pesanan siap diambil!' :
               orderStatus === 'preparing' ? '👨‍🍳 Sedang disiapkan...' :
               '⏳ Menunggu konfirmasi kasir'}
            </span>
            <span className="opacity-80 tracking-wider uppercase">Lihat Status →</span>
          </button>
        </div>
      )}

      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-[480px] mx-auto px-4 py-3 bg-h-dark border-t border-h-border">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-h-red hover:bg-h-red-d text-white rounded-xl py-3.5 flex items-center justify-between px-5 transition-colors"
            >
              <div className="bg-black/30 rounded px-2 py-0.5 text-xs font-bold">{totalItems}</div>
              <span className="font-bold text-sm uppercase tracking-wide">Lihat Pesanan</span>
              <span className="font-bold text-sm">{formatRp(totalPrice)}</span>
            </button>
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-[480px] bg-h-dark border-t border-h-border rounded-t-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-h-border rounded-full" />
            </div>
            <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-h-border">
              <h2 className="font-sans text-base font-black text-white uppercase tracking-wider">Pesanan Kamu</h2>
              <button onClick={() => setShowCart(false)} className="text-h-muted hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {items.filter(i => cart[i.id]).map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white truncate">{item.name}</div>
                    <div className="text-h-red text-xs mt-0.5">{formatRp(item.price * cart[item.id])}</div>
                  </div>
                  <div className="flex items-center gap-2.5 ml-4">
                    <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-full border border-h-border flex items-center justify-center text-white font-bold">−</button>
                    <span className="w-4 text-center font-bold text-sm text-white">{cart[item.id]}</span>
                    <button onClick={() => addItem(item.id)} className="w-7 h-7 rounded-full bg-h-red flex items-center justify-center text-white font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>
            {/* ── AI Recommendations ── */}
            {(aiRecsLoading || aiRecs.length > 0) && (
              <div className="px-5 py-3 border-t border-h-border bg-gradient-to-br from-h-red/5 to-transparent">
                <div className="text-[10px] uppercase tracking-widest font-black text-h-red mb-2 flex items-center gap-1.5">
                  ✨ Mungkin Cocok
                  {aiRecsLoading && <span className="text-h-muted animate-pulse">memilih...</span>}
                </div>
                {!aiRecsLoading && (
                  <div className="space-y-2">
                    {aiRecs.map(rec => {
                      const item = items.find(i => i.id === rec.id)
                      if (!item) return null
                      return (
                        <div key={item.id} className="flex items-center gap-3 bg-h-card/60 border border-h-border rounded-xl p-2.5">
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-h-dark">
                            <img src={item.image_url || generatePlaceholder(item)} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-sm truncate">{item.name}</div>
                            <div className="text-h-muted text-[11px] leading-snug line-clamp-2 italic">"{rec.reason}"</div>
                            <div className="text-h-red text-xs font-black mt-0.5">{formatRp(item.price)}</div>
                          </div>
                          <button onClick={() => addItem(item.id)}
                            className="w-9 h-9 rounded-full bg-h-red hover:bg-h-red-d flex items-center justify-center text-white font-bold text-lg leading-none transition-all active:scale-90 flex-shrink-0">+</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="px-5 pt-3 pb-2 border-t border-h-border">
              <label className="text-xs text-h-muted block mb-1.5">Nama Pemesan <span className="text-h-red">*</span></label>
              <input
                value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="Contoh: Andi"
                className="w-full bg-h-card border border-h-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-h-red transition-colors text-white placeholder-h-muted mb-3"
              />
              <label className="text-xs text-h-muted block mb-1.5">No. WhatsApp <span className="text-h-muted">(opsional · untuk notifikasi)</span></label>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full bg-h-card border border-h-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-h-red transition-colors text-white placeholder-h-muted mb-3"
              />
              <label className="text-xs text-h-muted block mb-1.5">Metode Bayar <span className="text-h-red">*</span></label>
              <div className="flex gap-2 mb-3">
                {([['tunai', '💵 Tunai'], ['qris', '⬛ QRIS']] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setPayMethod(val)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border ${payMethod === val ? 'bg-h-red border-h-red text-white' : 'bg-h-card border-h-border text-h-muted hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <label className="text-xs text-h-muted block mb-1.5">Catatan (opsional)</label>
              <textarea
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="Contoh: tanpa es, gula sedikit..."
                className="w-full bg-h-card border border-h-border rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:border-h-red transition-colors text-white placeholder-h-muted"
                rows={2}
              />
            </div>
            <div className="px-5 pt-2 pb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-h-muted text-sm">Total</span>
                <span className="text-xl font-black text-white">{formatRp(totalPrice)}</span>
              </div>
              {submitError && <p className="text-h-red text-xs mb-3 text-center">{submitError}</p>}
              {/* Block order baru kalau masih ada order aktif */}
              {orderId && !['done', 'cancelled'].includes(orderStatus) ? (
                <div className="bg-h-card border border-h-border rounded-xl p-4 text-center">
                  <div className="text-sm font-bold text-white mb-1">Ada pesanan yang sedang berjalan</div>
                  <div className="text-xs text-h-muted mb-3">Selesaikan atau tunggu pesananmu dulu sebelum order lagi.</div>
                  <button onClick={() => { setShowCart(false); setSubmitted(true) }}
                    className="w-full bg-h-red hover:bg-h-red-d text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors">
                    Lihat Status Pesanan →
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSubmit} disabled={submitting || !customerName.trim() || !payMethod}
                  className="w-full bg-h-red hover:bg-h-red-d disabled:opacity-60 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-colors"
                >{submitting ? 'Mengirim...' : 'Pesan Sekarang'}</button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 3D Product Showcase */}
      {showcase && (
        <ShowcaseModal
          item={showcase}
          qty={cart[showcase.id] || 0}
          onAdd={() => addItem(showcase.id)}
          onRemove={() => removeItem(showcase.id)}
          onClose={() => setShowcase(null)}
        />
      )}
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-h-bg flex items-center justify-center text-h-muted text-sm">Memuat menu...</div>}>
      <MenuContent />
    </Suspense>
  )
}
