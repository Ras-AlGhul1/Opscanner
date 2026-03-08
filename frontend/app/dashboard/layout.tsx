'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Activity, LayoutDashboard, Bookmark, LogOut, User, ChevronDown, Menu, X, Bell } from 'lucide-react';

const NAV_LINKS = [
  { href: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Live Feed' },
  { href: '/dashboard/saved',  icon: <Bookmark size={18} />, label: 'Saved' },
  { href: '/dashboard/alerts', icon: <Bell size={18} />,     label: 'Alerts' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [user, setUser] = useState<{ email: string; username: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return; }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', data.user.id)
        .single();
      setUser({
        email: data.user.email ?? '',
        username: profile?.username ?? data.user.email?.split('@')[0] ?? 'User',
      });
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-bg-secondary border-r border-border-dim flex flex-col
        transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border-dim gap-2 flex-shrink-0">
          <img src="/logo.svg" alt="ArbitraxAI" className="h-8 w-auto" />
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-accent-green rounded-full animate-pulse" />
            <span className="text-accent-green text-xs font-mono">LIVE</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${pathname === link.href
                  ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                  : 'text-text-secondary hover:text-white hover:bg-bg-hover'}
              `}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border-dim">
          <div className="relative">
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-hover transition-all"
            >
              <div className="w-8 h-8 bg-accent-green/20 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={15} className="text-accent-green" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-white text-sm font-medium truncate">{user?.username}</div>
                <div className="text-text-muted text-xs truncate">{user?.email}</div>
              </div>
              <ChevronDown size={14} className={`text-text-muted transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg-card border border-border-dim rounded-lg overflow-hidden shadow-xl">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-accent-red hover:bg-accent-red/10 transition-colors"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border-dim bg-bg-secondary/50 backdrop-blur flex items-center px-4 gap-4 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="lg:hidden text-text-secondary hover:text-white transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-1 text-text-muted text-xs font-mono">
            <Bell size={14} />
            <span>Alerts active</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
