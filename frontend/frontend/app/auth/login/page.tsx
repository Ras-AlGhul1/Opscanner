'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Eye, EyeOff, Loader2, Mail, Lock, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (loginError) throw loginError;
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-accent-blue/10 border border-accent-blue/20 rounded-full px-4 py-1 mb-5">
          <div className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-pulse" />
          <span className="text-accent-blue text-xs font-mono tracking-widest">SECURE LOGIN</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-white tracking-wide">WELCOME BACK</h1>
        <p className="text-text-muted text-sm mt-1">Access your scanner dashboard</p>
      </div>

      <div className="bg-bg-card border border-border-dim rounded-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-text-secondary text-xs font-mono uppercase tracking-wider mb-2">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-bg-secondary border border-border-dim rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-accent-blue/50 transition-colors placeholder-text-muted"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary text-xs font-mono uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-bg-secondary border border-border-dim rounded-lg pl-10 pr-10 py-3 text-white text-sm focus:outline-none focus:border-accent-blue/50 transition-colors placeholder-text-muted"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg px-4 py-2.5 text-accent-red text-sm font-mono">
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent-blue text-white font-display font-bold text-base py-3.5 rounded-lg hover:bg-accent-blue/90 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <>SIGN IN <ChevronRight size={18} /></>}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border-dim text-center">
          <span className="text-text-muted text-sm">No account? </span>
          <Link href="/auth/signup" className="text-accent-green hover:underline text-sm font-medium">
            Create one free
          </Link>
        </div>
      </div>
    </div>
  );
}
