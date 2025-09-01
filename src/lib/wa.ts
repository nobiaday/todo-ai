export type WaProxyResponse = {
    ok: boolean;
    status: number;
    data: any;
  };
  
  export async function sendToWhatsApp(message: string, number?: string): Promise<WaProxyResponse> {
    // Permite desactivar el envío desde el cliente
    if (process.env.NEXT_PUBLIC_WA_ENABLED === 'false') {
      return { ok: true, status: 204, data: { skipped: true } };
    }
  
    const res = await fetch('/api/wha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: message, number }),
    });
  
    let json: any = {};
    try {
      json = await res.json();
    } catch {
      json = {};
    }
  
    if (!res.ok) {
      throw new Error(json?.error || `WA request failed (${res.status})`);
    }
  
    return json as WaProxyResponse;
  }
  