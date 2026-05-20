import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MESHY_BASE = 'https://api.meshy.ai/openapi/v1/image-to-3d'

export async function GET(req: NextRequest) {
  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'MESHY_API_KEY belum di-set' }, { status: 503 })

  const taskId = req.nextUrl.searchParams.get('id')
  if (!taskId) return NextResponse.json({ error: 'task id wajib' }, { status: 400 })

  try {
    const res = await fetch(`${MESHY_BASE}/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const json = await res.json()
    if (!res.ok) return NextResponse.json({ error: json.message || `Meshy error: ${res.status}` }, { status: res.status })

    // status: PENDING | IN_PROGRESS | SUCCEEDED | FAILED
    return NextResponse.json({
      status: json.status,
      progress: json.progress || 0,
      glbUrl: json.model_urls?.glb || null,
      thumbnailUrl: json.thumbnail_url || null,
      error: json.task_error?.message || null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
