'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { LangToggle } from '@/components/ui/LangToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();

  // Surface OAuth callback errors (e.g. ?error=access_denied)
  useEffect(() => {
    const err = searchParams.get('error');
    if (err) setMessage(err);
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        setMessage(error.message);
        return;
      }
      window.location.href = '/dashboard';
    } catch (err) {
      setLoading(false);
      setMessage(err instanceof Error ? err.message : 'Network error. Please try again.');
    }
  };

  const handleGoogle = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setMessage(error.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'OAuth failed. Please try again.');
    }
  };

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-16">
      {/* Ambient backdrop — matches landing aesthetic */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[10%] h-[40vh] w-[40vh] rounded-full bg-[var(--color-primary-700)]/30 blur-[120px]" />
        <div className="absolute right-[10%] bottom-[10%] h-[40vh] w-[40vh] rounded-full bg-[var(--color-secondary-600)]/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex items-center justify-end">
          <LangToggle />
        </div>

        <GlassCard glow="primary" padding="lg" className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--color-primary-500)] via-[var(--color-secondary-500)] to-[var(--color-accent-cyan-400)] shadow-[var(--shadow-glow-primary-md)]">
              <LogIn size={20} className="text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">Welcome back, Aspirant</h1>
            <p className="mt-1 text-sm text-white/55">Sign in to continue your journey</p>
          </div>

          {message && (
            <div
              role="alert"
              className="rounded-xl border border-[var(--color-error-500)]/30 bg-[var(--color-error-500)]/10 p-3 text-sm text-[var(--color-error-500)]"
            >
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/35 focus:border-[var(--color-primary-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)]/40"
              required
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/35 focus:border-[var(--color-primary-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)]/40"
              required
            />
            <Button type="submit" disabled={loading} variant="primary" size="md" block>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[var(--color-surface-100)]/60 px-2 text-white/40">or</span>
            </div>
          </div>

          <Button onClick={handleGoogle} variant="ghost" size="md" block>
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-sm text-white/45">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[var(--color-primary-300)] hover:text-[var(--color-primary-200)]">
              Sign up
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
