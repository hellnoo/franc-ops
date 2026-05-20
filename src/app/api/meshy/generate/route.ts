import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MESHY_BASE = 'https://api.meshy.ai/openapi/v1/image-to-3d'

export async function POST(req: NextRequest) {
  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'MESHY_API_KEY belum di-set di Vercel env.' }, { status: 503 })

  try {
    const { imageUrl } = await req.json()
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl wajib' }, { status: 400 })

    const res = await fetch(MESHY_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        enable_pbr: true,
        should_remesh: true,
        should_texture: true,
        ai_model: 'meshy-4',
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: json.message || `Meshy error: ${res.status}` }, { status: res.status })
    }

    return NextResponse.json({ taskId: json.result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
