import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { user_email, message } = await req.json();
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

  try {
    const r = await fetch(process.env.N8N_CHAT_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.N8N_API_KEY || '' },
      body: JSON.stringify({ userEmail: user_email, message })
    });

    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { reply: text }; }

    const reply =
      data.reply ??
      data.output_text ??
      data.text ??
      data.choices?.[0]?.message?.content ??
      '(sin respuesta)';

    return NextResponse.json({ reply });
  } catch (e) {
    console.error('n8n chat error', e);
    return NextResponse.json({ reply: '(error talking to bot)' });
  }
}
