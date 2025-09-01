'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { TaskBoard } from '@/components/task-board';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
      
      if (session?.user) {
        console.log('Session found:', session.user.email);
      }
    };
    
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log('Auth state change:', event, s?.user?.email);
      setSession(s);
      
      if (event === 'SIGNED_IN' && s) {
        // Add a small delay to ensure session is fully established
        setTimeout(() => {
          router.replace('/');
        }, 100);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setSending(true);
    setMessage('');
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Check your email for the magic link!');
        setEmail('');
      }
    } catch (err) {
      setMessage('An unexpected error occurred');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Welcome to To-Do AI</h1>
            <p className="text-muted-foreground">Sign in to get started</p>
          </div>
          
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Sign in with Magic Link'}
            </button>
          </form>
          
          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <TaskBoard />
    </main>
  );
}
