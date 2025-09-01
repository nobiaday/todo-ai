import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
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

  const url = new URL(req.url);
  const includeWA =
    url.searchParams.get('include')?.includes('whatsapp') ||
    url.searchParams.get('all') === '1';

  console.log('GET /api/tasks - User:', user?.email, 'IncludeWA:', includeWA);

  // ALWAYS fetch all tasks when includeWA is true, then filter in code
  if (user && includeWA) {
    console.log('Fetching all tasks and filtering in code...');
    
    // Test 1: Try to get ALL tasks without any conditions
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select('*');

    if (error) {
      console.error('Tasks query error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('All tasks in database:', allTasks?.length || 0);
    if (allTasks && allTasks.length > 0) {
      console.log('All task sources:', allTasks.map(t => ({ 
        id: t.id, 
        source: t.source, 
        user_id: t.user_id, 
        user_email: t.user_email 
      })));
    } else {
      console.log('No tasks found - this might be an RLS policy issue');
      
      // Test 2: Try to get just WhatsApp tasks
      const { data: waTasks, error: waError } = await supabase
        .from('tasks')
        .select('*')
        .eq('source', 'whatsapp');
        
      console.log('WhatsApp tasks only:', waTasks?.length || 0, 'Error:', waError);
      
      // Test 3: Try to get user's tasks
      const { data: userTasks, error: userError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);
        
      console.log('User tasks only:', userTasks?.length || 0, 'Error:', userError);
    }
    
    // Filter tasks: user's tasks OR WhatsApp tasks
    const filteredTasks = allTasks?.filter(task => 
      task.user_id === user.id || 
      task.user_email === user.email || 
      task.source === 'whatsapp'
    ) || [];
    
    console.log('Filtered tasks:', filteredTasks.length);
    console.log('Filtered task sources:', filteredTasks.map(t => ({ 
      id: t.id, 
      source: t.source, 
      user_id: t.user_id, 
      user_email: t.user_email 
    })));
    
    return NextResponse.json(filteredTasks, { status: 200 });
  } else if (user) {
    // User is authenticated but doesn't want WhatsApp tasks
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`user_id.eq.${user.id},user_email.eq.${user.email}`)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Tasks query error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    console.log('User tasks only:', data?.length || 0);
    return NextResponse.json(data ?? [], { status: 200 });
  } else if (includeWA) {
    // No user but wants WhatsApp tasks
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('source', 'whatsapp')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Tasks query error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    console.log('WhatsApp tasks only:', data?.length || 0);
    return NextResponse.json(data ?? [], { status: 200 });
  } else {
    // No user and doesn't want WhatsApp tasks
    console.log('No tasks (no user, no WhatsApp)');
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const { title } = await req.json();
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing title' }, { status: 400 });
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth check:', { user: user?.email, error: authError });
    
    // Add validation for authenticated user
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    }

    const user_id = user.id;
    const user_email = user.email;
    
    console.log('Creating task for user:', { user_id, user_email });

    const useEnhance = String(process.env.ENHANCE_ON_CREATE || '').toLowerCase() !== 'false';
    let enhanced_title: string = title;
    let steps: any[] = [];

    if (useEnhance) {
      const enhanceUrl = process.env.N8N_ENHANCE_URL!;
      const enhanceKey = process.env.N8N_API_KEY!;
      const headerName = process.env.N8N_HEADER_NAME || 'x-api-key';
      try {
        const r = await fetch(enhanceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [headerName]: enhanceKey },
          body: JSON.stringify({ title }),
          cache: 'no-store',
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok) {
          enhanced_title = j?.enhanced_title || title;
          steps = Array.isArray(j?.steps) ? j.steps : [];
        }
      } catch { /* seguir con title original */ }
    }

    const insert = {
      title,
      enhanced_title,
      steps,
      completed: false,
      user_id,
      user_email,
      source: 'web' as const,
    };

    const { data, error } = await supabase.from('tasks').insert(insert).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, task: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
