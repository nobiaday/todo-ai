'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // 1) Al cargar, si ya hay sesión, redirige
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/');
    });
    // 2) Si la sesión se establece unos ms después (hash en URL), captúrala y redirige
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="text-sm text-muted-foreground">Signing you in…</div>
    </div>
  );
}
