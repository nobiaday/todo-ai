import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { note } = await req.json();
  if (!id || !note || typeof note !== 'string') {
    return NextResponse.json({ ok: false, error: 'Missing id or note' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  const user_email = user?.email ?? 'web';

  console.log(`[NOTE] Processing note for task ${id}, user: ${user_email}`);

  // Get current task data
  const { data: task, error: selErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (selErr) {
    console.error('[NOTE] Task fetch error:', selErr);
    return NextResponse.json({ ok: false, error: selErr.message }, { status: 400 });
  }

  if (!task) {
    console.error('[NOTE] Task not found:', id);
    return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 });
  }

  console.log('[NOTE] Task found:', { 
    id: task.id, 
    title: task.title, 
    user_id: task.user_id, 
    user_email: task.user_email, 
    source: task.source 
  });

  // Call AI improvement workflow
  const enhanceUrl = process.env.N8N_ENHANCE_URL;
  const enhanceKey = process.env.N8N_API_KEY;
  const headerName = process.env.N8N_HEADER_NAME || 'x-api-key';

  if (enhanceUrl && enhanceKey) {
    try {
      console.log('[NOTE] Calling AI improvement workflow:', enhanceUrl);
      
      const aiResponse = await fetch(enhanceUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          [headerName]: enhanceKey 
        },
        body: JSON.stringify({ 
          task_id: id,
          title: task.title,
          note: note,
          user_email: user_email
        }),
        cache: 'no-store',
      });

      console.log('[NOTE] AI response status:', aiResponse.status);

      if (aiResponse.ok) {
        const aiData = await aiResponse.json().catch(() => ({}));
        console.log('[NOTE] AI improvement response:', aiData);
        
        // Update task with AI improvements
        const updates: any = {};
        
        // Check for enhancedTitle (note the camelCase from your n8n workflow)
        if (aiData.enhancedTitle && aiData.enhancedTitle !== task.title) {
          updates.enhanced_title = aiData.enhancedTitle;
          console.log('[NOTE] Updating enhanced_title to:', aiData.enhancedTitle);
        }
        
        if (aiData.steps && Array.isArray(aiData.steps) && aiData.steps.length > 0) {
          updates.steps = aiData.steps;
          console.log('[NOTE] Updating steps to:', aiData.steps);
        }

        // Add note to the task
        const list = Array.isArray(task.notes) ? task.notes : [];
        const newNote = { 
          id: randomUUID(), 
          text: note, 
          user: user_email, 
          at: new Date().toISOString(),
          ai_improvement: aiData
        };
        updates.notes = [...list, newNote];

        console.log('[NOTE] Final updates:', updates);

        // Update the task - try with explicit conditions for WhatsApp tasks
        let updateQuery = supabase
          .from('tasks')
          .update(updates)
          .eq('id', id);

        // For WhatsApp tasks, we might need to be more specific
        if (task.source === 'whatsapp') {
          console.log('[NOTE] Updating WhatsApp task with source condition');
          updateQuery = updateQuery.eq('source', 'whatsapp');
        }

        const { error: upErr } = await updateQuery;

        if (upErr) {
          console.error('[NOTE] Update error:', upErr);
          return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
        }
        
        console.log('[NOTE] Task updated successfully');
        
        // Fetch the updated task to return to frontend
        const { data: updatedTask, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('[NOTE] Error fetching updated task:', fetchError);
          return NextResponse.json({ 
            ok: true, 
            notes: updates.notes,
            ai_improvement: aiData
          }, { status: 200 });
        }

        console.log('[NOTE] Returning updated task:', updatedTask);
        return NextResponse.json({ 
          ok: true, 
          notes: updates.notes,
          ai_improvement: aiData,
          task: updatedTask
        }, { status: 200 });
      } else {
        console.error('[NOTE] AI workflow failed with status:', aiResponse.status);
        const errorText = await aiResponse.text();
        console.error('[NOTE] AI workflow error:', errorText);
      }
    } catch (error) {
      console.error('[NOTE] AI improvement failed:', error);
    }
  } else {
    console.log('[NOTE] AI workflow not configured - missing ENHANCE_URL or API_KEY');
  }

  // Fallback: just add note without AI improvement
  const list = Array.isArray(task.notes) ? task.notes : [];
  const newNote = { id: randomUUID(), text: note, user: user_email, at: new Date().toISOString() };
  const updated = [...list, newNote];

  console.log('[NOTE] Adding note without AI improvement:', updated);

  let updateQuery = supabase
    .from('tasks')
    .update({ notes: updated })
    .eq('id', id);

  // For WhatsApp tasks, we might need to be more specific
  if (task.source === 'whatsapp') {
    console.log('[NOTE] Updating WhatsApp task with source condition (fallback)');
    updateQuery = updateQuery.eq('source', 'whatsapp');
  }

  const { error: upErr } = await updateQuery;

  if (upErr) {
    console.error('[NOTE] Fallback update error:', upErr);
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
  }
  
  // Fetch the updated task to return to frontend
  const { data: updatedTask, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('[NOTE] Error fetching updated task (fallback):', fetchError);
    return NextResponse.json({ ok: true, notes: updated }, { status: 200 });
  }

  console.log('[NOTE] Returning updated task (fallback):', updatedTask);
  return NextResponse.json({ 
    ok: true, 
    notes: updated,
    task: updatedTask
  }, { status: 200 });
}
