import Anthropic from '@anthropic-ai/sdk'

const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()

export const anthropic = apiKey && apiKey.startsWith('sk-ant-') ? new Anthropic({ apiKey }) : null

export const MODEL = 'claude-sonnet-4-20250514' // sesuaikan kalau perlu

export function isAiEnabled() {
  return !!anthropic
}

export function aiErrorDetails(): string {
  if (!apiKey) return 'ANTHROPIC_API_KEY belum di-set di Vercel env. Cek Settings → Environment Variables, lalu Redeploy.'
  if (!apiKey.startsWith('sk-ant-')) return 'ANTHROPIC_API_KEY format salah — harus mulai dengan "sk-ant-".'
  return 'AI tidak ter-inisialisasi.'
}

// Helper untuk extract text dari response
export function extractText(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim()
}
