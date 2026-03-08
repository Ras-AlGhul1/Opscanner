import { Activity } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <nav className="border-b border-border-dim bg-bg-secondary/50 px-4 h-14 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent-green rounded-sm flex items-center justify-center">
            <Activity size={14} className="text-bg-primary" />
          </div>
          <span className="font-display font-bold text-lg tracking-wider text-white">
            <img src="/logo.svg" alt="ArbitraxAI" className="h-8 w-auto" />
          </span>
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center p-4">{children}</div>
    </div>
  );
}
