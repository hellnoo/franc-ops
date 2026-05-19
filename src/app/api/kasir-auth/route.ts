import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { password } = await req.json()
  const kasirPw = process.env.KASIR_PASSWORD || process.env.ADMIN_PASSWORD
  if (password === kasirPw) {
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Password salah' }, { status: 401 })
}
