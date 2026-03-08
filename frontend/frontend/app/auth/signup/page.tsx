'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Eye, EyeOff, Loader2, User, Mail, Lock, ChevronRight } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!form.username.trim()) { setError('Username is required'); return; }

    setLoading(true);
    try {
      // Fix 5: Validate username length and characters
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (form.username.length > 30) { setError('Username must be 30 characters or less'); setLoading(false); return; }
      if (!usernameRegex.test(form.username)) { setError('Username can only contain letters, numbers, underscores and hyphens'); setLoading(false); return; }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { username: form.username } },
      });
      if (signUpError) throw signUpError;

      if (data.user) {
        // Insert user profile
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email: form.email,
          username: form.username,
        });
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-accent-green/10 border border-accent-green/20 rounded-full px-4 py-1 mb-5">
          <div className="w-1.5 h-1.5 bg-accent-green rounded-full animate-pulse" />
          <span className="text-accent-green text-xs font-mono tracking-widest">SCANNER ACCESS</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-white tracking-wide">CREATE ACCOUNT</h1>
        <p className="text-text-muted text-sm mt-1">Join the scanner network</p>
      </div>

      {/* Card */}
      <div className="bg-bg-card border border-border-dim rounded-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-text-secondary text-xs font-mono uppercase tracking-wider mb-2">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-bg-secondary border border-border-dim rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-accent-green/50 transition-colors placeholder-text-muted"
                placeholder="your@email.com"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-text-secondary text-xs font-mono uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                required
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full bg-bg-secondary border border-border-dim rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-accent-green/50 transition-colors placeholder-text-muted"
                placeholder="scanner_pro"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-text-secondary text-xs font-mono uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-bg-secondary border border-border-dim rounded-lg pl-10 pr-10 py-3 text-white text-sm focus:outline-none focus:border-accent-green/50 transition-colors placeholder-text-muted"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-text-secondary text-xs font-mono uppercase tracking-wider mb-2">Confirm Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className="w-full bg-bg-secondary border border-border-dim rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-accent-green/50 transition-colors placeholder-text-muted"
                placeholder="••••••••"
              />
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
            className="w-full flex items-center justify-center gap-2 bg-accent-green text-bg-primary font-display font-bold text-base py-3.5 rounded-lg hover:bg-accent-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <>CREATE ACCOUNT <ChevronRight size={18} /></>}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border-dim text-center">
          <span className="text-text-muted text-sm">Already have an account? </span>
          <Link href="/auth/login" className="text-accent-green hover:underline text-sm font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
