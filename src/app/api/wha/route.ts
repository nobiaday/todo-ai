// src/app/api/wha/route.ts  (App Router)
import { NextResponse } from "next/server";

type WaPayload = { body: string; number?: string };

export async function POST(req: Request) {
  try {
    const { body, number }: WaPayload = await req.json();

    if (!body || typeof body !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing 'body' string" },
        { status: 400 }
      );
    }

    const url = process.env.N8N_SEND_WA_URL;
    const key = process.env.N8N_SEND_WA_KEY;
    const headerName = process.env.N8N_HEADER_NAME || "x-api-key";

    if (!url || !key) {
      return NextResponse.json(
        { ok: false, error: "Server not configured for n8n (WA)" },
        { status: 500 }
      );
    }

    // proxy a n8n (workflow send-wa). n8n hará el filtro #to-do (TRUE/FALSE)
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [headerName]: key,
      },
      body: JSON.stringify({ body, number }),
    });

    const data = await r.json().catch(() => ({}));
    return NextResponse.json({ ok: r.ok, status: r.status, data }, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "WA proxy error" },
      { status: 500 }
    );
  }
}
