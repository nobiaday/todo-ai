'use client';

import { useState } from 'react';
import { sendToWhatsApp } from '@/lib/wa';

interface WaBoxProps {
  onTaskCreated?: () => void;
}

export default function WaBox({ onTaskCreated }: WaBoxProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const waEnabled = process.env.NEXT_PUBLIC_WA_ENABLED !== 'false';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    const msg = value.trim();
    if (!msg) return;

    try {
      setLoading(true);
      const res = await sendToWhatsApp(msg);
      const reply =
        (res?.data && (res.data.reply || res.data.message || res.data.text)) ??
        (res?.ok ? 'Sent.' : 'No response.');
      setResult(typeof reply === 'string' ? reply : JSON.stringify(reply));
      setValue('');
      
      // Trigger task refresh after sending WhatsApp message
      if (res?.ok && onTaskCreated) {
        // Wait a bit for the n8n workflow to process and create the task
        setTimeout(() => {
          onTaskCreated();
        }, 2000);
      }
    } catch (err: any) {
      setResult(err?.message || 'WA request failed');
    } finally {
      setLoading(false);
    }
  };

  if (!waEnabled) {
    return (
      <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
        <strong>WhatsApp is disabled</strong>
        <div>Set <code>NEXT_PUBLIC_WA_ENABLED=true</code> to enable this box.</div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='Type a message (e.g. "#to-do improve landing headline")'
          disabled={loading}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 8 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: loading ? '#777' : '#111',
            color: '#fff',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Sending…' : 'Send WA'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 10, fontSize: 14, color: '#333' }}>
          <strong>Response:</strong> {result}
        </div>
      )}
    </div>
  );
}
