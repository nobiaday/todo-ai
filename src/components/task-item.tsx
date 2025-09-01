'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Task } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, Pencil, Trash2, Sparkles } from 'lucide-react';

export function TaskItem({
  task,
  onChanged,
  onDeleted,
}: {
  task: Task;
  onChanged: () => void;
  onDeleted?: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedLocal, setCompletedLocal] = useState(!!task.completed);
  const [currentTask, setCurrentTask] = useState<Task>(task);

  // Update local state when task prop changes
  useEffect(() => {
    setCurrentTask(task);
    setTitle(task.title);
    setCompletedLocal(!!task.completed);
  }, [task]);

  const [stepsText, setStepsText] = useState(
    Array.isArray(currentTask.steps)
      ? currentTask.steps
          .map((s: any) => (typeof s === 'string' ? s : s?.text ?? JSON.stringify(s)))
          .join('\n')
      : ''
  );

  // Update steps text when task changes
  useEffect(() => {
    setStepsText(
      Array.isArray(currentTask.steps)
        ? currentTask.steps
            .map((s: any) => (typeof s === 'string' ? s : s?.text ?? JSON.stringify(s)))
            .join('\n')
        : ''
    );
  }, [currentTask.steps]);

  const stepsArray = useMemo(
    () => stepsText.split('\n').map((s) => s.trim()).filter(Boolean),
    [stepsText]
  );

  const patch = async (body: Record<string, any>) => {
    const r = await fetch(`/api/tasks/${currentTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });    
    if (!r.ok) console.error('PATCH failed', await r.text());
  };

  const toggleDone = async (checked: boolean) => {
    const prev = completedLocal;
    setCompletedLocal(checked);
    try {
      await patch({ completed: checked });
      onChanged();
    } catch (e) {
      console.error(e);
      setCompletedLocal(prev);
    }
  };

  const saveEdits = async () => {
    setLoading(true);
    try {
      await patch({ title, steps: stepsArray });
      setEditing(false);
      onChanged();
    } finally {
      setLoading(false);
    }
  };

  const del = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      const r = await fetch(`/api/tasks/${currentTask.id}`, { method: 'DELETE' });
      if (!r.ok) {
        console.error('DELETE failed', await r.text());
        onChanged();
        return;
      }
      onDeleted?.(currentTask.id);
    } catch (e) {
      console.error(e);
      onChanged();
    }
  };

  const submitNote = async () => {
    if (!note.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/tasks/${currentTask.id}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note,
          user_email: currentTask.user_email ?? 'test@example.com',
        }),
      });
      
      if (!r.ok) {
        console.error('note submit failed', await r.text());
        return;
      }
      
      const result = await r.json();
      console.log('Note submitted successfully:', result);
      
      setNote('');
      setNoteOpen(false);
      
      // Update the local task data if the API returns the updated task
      if (result.task) {
        console.log('Updating task with new data:', result.task);
        setCurrentTask(result.task);
      }
      
      // Also trigger a refresh to ensure everything is in sync
      onChanged();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 mx-auto max-w-3xl">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={completedLocal}
            onCheckedChange={(v) => toggleDone(Boolean(v))}
            className="mt-1"
          />
          <div className="flex-1 min-w-0 text-left">
            {!editing ? (
              <>
                <div className="font-semibold truncate">
                  {currentTask.enhanced_title ?? currentTask.title}
                </div>
                {currentTask.enhanced_title && (
                  <div className="text-sm text-muted-foreground truncate">
                    (Original: {currentTask.title})
                  </div>
                )}
              </>
            ) : (
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full" />
            )}
          </div>

          <CollapsibleTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Expand" className="ml-2">
              <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-6 items-start pl-[38px]">
            <div className="text-left space-y-3">
              {!editing ? (
                <>
                  {Array.isArray(currentTask.steps) && currentTask.steps.length > 0 && (
                    <div>
                      <div className="font-semibold mb-1">Suggested steps</div>
                      <ol className="list-decimal pl-5 space-y-1">
                        {currentTask.steps.map((s: any, i: number) => (
                          <li key={i}>
                            {typeof s === 'string' ? s : s?.text ?? JSON.stringify(s)}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  
                  {/* Display notes */}
                  {Array.isArray(currentTask.notes) && currentTask.notes.length > 0 && (
                    <div>
                      <div className="font-semibold mb-1">Notes</div>
                      <div className="space-y-2">
                        {currentTask.notes.map((note: any, i: number) => (
                          <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                            <div className="font-medium text-xs text-gray-500 mb-1">
                              {note.user} • {new Date(note.at).toLocaleString()}
                            </div>
                            <div>{note.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-semibold mb-1">Suggested steps</div>
                  <Textarea
                    value={stepsText}
                    onChange={(e) => setStepsText(e.target.value)}
                    placeholder={'1) First step\n2) Second step'}
                    className="min-h-[120px]"
                  />
                </>
              )}

              <Button size="sm" onClick={() => setNoteOpen(true)} disabled={loading}>
                <Sparkles className="w-4 h-4 mr-2" /> Add note
              </Button>
            </div>

            <div className="flex flex-col items-end justify-end gap-2 self-end">
              {!editing ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                    aria-label="Edit title and steps"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); del(); }}
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={saveEdits} disabled={loading}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditing(false);
                      setTitle(currentTask.title);
                      setStepsText(stepsArray.join('\n'));
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add note (what should the AI improve?)</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="e.g., make it more specific, split into sub-steps, add best practices…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setNoteOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={submitNote} disabled={loading}>
              {loading ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
