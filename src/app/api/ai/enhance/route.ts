import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const payload = await req.json()
  // payload: { taskId, title, note? }
  const url = process.env.N8N_ENHANCE_WEBHOOK_URL!
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // si tu webhook requiere token:
      // headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.N8N_TOKEN! }
    })
    const data = await r.json()
    // Esperamos { enhanced_title: string, steps: string[] | object[], suggestions: string[] }
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'n8n error' }, { status: 500 })
  }
}
