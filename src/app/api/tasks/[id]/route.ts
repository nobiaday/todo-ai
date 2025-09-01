// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const cookieStore = await cookies()
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
  )
  
  // Add user verification
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  
  const { title, completed, steps } = await req.json()

  const updates: Record<string, any> = {}
  if (typeof title === 'string') updates.title = title
  if (typeof completed === 'boolean') updates.completed = completed
  if (Array.isArray(steps)) updates.steps = steps

  const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 200 })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const cookieStore = await cookies()
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
  )
  
  // Add user verification
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  
  console.log(`[DELETE] Attempting to delete task ${id} for user ${user.email}`)
  
  // Verify task belongs to user OR is a WhatsApp task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('user_id, user_email, source')
    .eq('id', id)
    .single()

  if (taskError) {
    console.error('[DELETE] Task fetch error:', taskError)
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (!task) {
    console.log(`[DELETE] Task ${id} not found`)
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  console.log(`[DELETE] Task found:`, { id, user_id: task.user_id, user_email: task.user_email, source: task.source })

  // Allow deletion if:
  // 1. Task belongs to the user, OR
  // 2. Task is from WhatsApp (regardless of user_id)
  const canDelete = task.user_id === user.id || 
                   task.user_email === user.email || 
                   task.source === 'whatsapp'

  console.log(`[DELETE] Can delete: ${canDelete} (user.id: ${user.id}, task.user_id: ${task.user_id}, source: ${task.source})`)

  if (!canDelete) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // For WhatsApp tasks, try deleting with source condition
  let deleteQuery = supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (task.source === 'whatsapp') {
    console.log('[DELETE] Deleting WhatsApp task with source condition');
    deleteQuery = deleteQuery.eq('source', 'whatsapp');
  }

  const { data, error } = await deleteQuery.select('id').maybeSingle()

  if (error) {
    console.error('[DELETE] Delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  console.log(`[DELETE] Task ${id} deleted successfully`)
  return NextResponse.json({ ok: true, id }, { status: 200 })
}
