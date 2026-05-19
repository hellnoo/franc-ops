import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY

export const anthropic = apiKey ? new Anthropic({ apiKey }) : null

export const MODEL = 'claude-sonnet-4-20250514' // sesuaikan kalau perlu

export function isAiEnabled() {
  return !!apiKey
}

// Helper untuk extract text dari response
export function extractText(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim()
}
