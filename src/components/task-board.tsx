'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Task } from '@/types/task';
import { TaskItem } from '../components/task-item';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import WaBox from './wa-box';

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('%c[TB] TaskBoard mounted', 'color:#16a34a');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const ctrl = new AbortController();
    try {
      // 👇 incluye también las tareas provenientes de WhatsApp
      const r = await fetch('/api/tasks?include=whatsapp', { cache: 'no-store', credentials: 'same-origin' });
      const data = await r.json().catch(() => []);
      if (!r.ok) throw new Error(JSON.stringify(data));
      const list: Task[] = Array.isArray(data) ? data : (data?.data ?? []);
      setTasks(list);
      // eslint-disable-next-line no-console
      console.log('[TB] loaded tasks:', list);
      console.log('[TB] task sources:', list.map(t => ({ id: t.id, source: t.source, user_id: t.user_id, user_email: t.user_email })));
    } catch (e) {
      console.error('[TB] load tasks failed:', e);
    } finally {
      setLoading(false);
    }
    return () => ctrl.abort();
  }, []);

  useEffect(() => { 
    load(); 
    
    // Auto-refresh every 30 seconds to catch WhatsApp tasks
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleDeleted = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const add = async () => {
    const raw = title.trim();
    if (!raw || adding) return;

    setAdding(true);
    // eslint-disable-next-line no-console
    console.log('%c[ADD] sending:', 'color:#2563eb', raw);

    try {
      const r = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        body: JSON.stringify({ title: raw }),
      });

      const payload = await r.json().catch(() => ({} as any));
      // eslint-disable-next-line no-console
      console.log('[ADD] status:', r.status, 'body:', payload);

      if (!r.ok) {
        alert('Add failed: ' + (payload?.error || `status ${r.status}`));
        return;
      }

      setTitle('');

      // OPTIMISTIC UPDATE: si la API devuelve la fila creada, la añadimos al inicio.
      const created = (payload as any)?.task as Task | undefined;
      if (created && created.id) {
        setTasks(prev => [created, ...prev.filter(t => t.id !== created.id)]);
      } else {
        await load();
      }
    } catch (err) {
      console.error('[ADD] failed:', err);
      alert('Add failed (client/network). Check console.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-center">To-Do</h1>
        <Button variant="secondary" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Add box */}
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <Button type="button" onClick={add} disabled={adding || !title.trim()}>
          {adding ? 'Adding…' : 'Add'}
        </Button>
      </div>

      {tasks.length === 0 && !loading && (
        <div className="text-center text-sm text-muted-foreground py-6">
          No tasks yet — add your first task above.
        </div>
      )}

      <ul className="space-y-3">
        {tasks.map((t) => (
          <li key={t.id}>
            <TaskItem task={t} onChanged={load} onDeleted={handleDeleted} />
          </li>
        ))}
      </ul>

      {/* WhatsApp Box */}
      <WaBox onTaskCreated={load} />
    </main>
  );
}
