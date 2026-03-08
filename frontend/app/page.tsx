'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TrendingUp, Zap, Shield, ChevronRight, Activity, DollarSign, Target } from 'lucide-react';

const TICKER_ITEMS = [
  { label: 'BTC/ETH Arb', profit: '+$847', change: '+12.3%', cat: 'CRYPTO' },
  { label: 'Lakers -3.5 Hedge', profit: '+$234', change: '+8.7%', cat: 'SPORTS' },
  { label: 'PS5 Restock Flip', profit: '+$120', change: '+24%', cat: 'RESELL' },
  { label: 'SOL/USDC Arb', profit: '+$1,204', change: '+6.1%', cat: 'CRYPTO' },
  { label: 'Price Error: RTX 4090', profit: '+$680', change: '+45%', cat: 'DEAL' },
  { label: 'MLS Arbitrage', profit: '+$312', change: '+15.2%', cat: 'SPORTS' },
];

const STATS = [
  { value: '2,847', label: 'Opportunities Found Today' },
  { value: '$1.2M', label: 'Estimated Profit Discovered' },
  { value: '94%', label: 'Scanner Accuracy' },
  { value: '<30s', label: 'New Scan Interval' },
];

const FEATURES = [
  {
    icon: <Zap size={22} />,
    color: 'accent-green',
    title: 'Real-Time Scanning',
    desc: 'AI continuously monitors sports books, crypto exchanges, and retail platforms every 30 seconds.',
  },
  {
    icon: <Target size={22} />,
    color: 'accent-blue',
    title: 'Confidence Scoring',
    desc: 'Each opportunity is ranked 0–100 based on historical patterns, volume, and timing signals.',
  },
  {
    icon: <DollarSign size={22} />,
    color: 'accent-orange',
    title: 'Profit Estimation',
    desc: 'Instant profit projections factoring in fees, slippage, and realistic execution windows.',
  },
  {
    icon: <Shield size={22} />,
    color: 'accent-purple',
    title: 'Risk Analysis',
    desc: 'Every signal comes with risk flags and expiry windows so you can act fast and smart.',
  },
];

export default function LandingPage() {
  const [tickerOffset, setTickerOffset] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setTickerOffset(o => (o + 1) % (TICKER_ITEMS.length * 200));
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary scanlines overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-dim bg-bg-primary/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent-green rounded-sm flex items-center justify-center">
              <Activity size={14} className="text-bg-primary" />
            </div>
            <span className="font-display font-bold text-lg tracking-wider text-white">
              <img src="/logo.svg" alt="ArbitraxAI" className="h-7 w-auto" />
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-text-secondary hover:text-white text-sm transition-colors px-3 py-1.5">
              Login
            </Link>
            <Link href="/auth/signup" className="bg-accent-green text-bg-primary text-sm font-display font-bold px-4 py-1.5 rounded hover:bg-accent-green/90 transition-all">
              GET ACCESS
            </Link>
          </div>
        </div>
      </nav>

      {/* Live Ticker */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-bg-secondary border-b border-border-dim overflow-hidden h-8 flex items-center">
        <div className="flex-shrink-0 bg-accent-green text-bg-primary text-xs font-mono font-bold px-3 h-full flex items-center tracking-wider">
          LIVE
        </div>
        <div className="overflow-hidden flex-1 relative">
          <div
            className="flex gap-8 absolute whitespace-nowrap transition-none"
            style={{ transform: `translateX(-${tickerOffset}px)` }}
          >
            {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-text-muted font-mono">[{item.cat}]</span>
                <span className="text-text-secondary">{item.label}</span>
                <span className="text-accent-green font-mono font-bold">{item.profit}</span>
                <span className="text-text-muted">{item.change}</span>
                <span className="text-border-bright mx-2">◆</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-36 pb-24 px-4 relative">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(#1e2d3d 1px, transparent 1px), linear-gradient(90deg, #1e2d3d 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-32 left-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-48 right-1/4 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-accent-green/10 border border-accent-green/20 rounded-full px-4 py-1.5 mb-8">
            <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
            <span className="text-accent-green text-xs font-mono tracking-widest">SCANNER ACTIVE — 2,847 OPPORTUNITIES FOUND TODAY</span>
          </div>

          <h1 className="font-display text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight tracking-wide">
            FIND PROFIT<br />
            <span className="text-accent-green glow-green">BEFORE ANYONE ELSE</span>
          </h1>

          <p className="text-text-secondary text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            AI-powered scanner that monitors sports books, crypto exchanges, and retail platforms
            to surface arbitrage opportunities and price mistakes in real-time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/signup"
              className="group flex items-center gap-2 bg-accent-green text-bg-primary font-display font-bold text-lg px-8 py-3.5 rounded hover:bg-accent-green/90 transition-all hover:shadow-[0_0_30px_rgba(0,255,136,0.3)]"
            >
              START SCANNING FREE
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/login"
              className="flex items-center gap-2 border border-border-bright text-text-secondary font-display font-bold text-lg px-8 py-3.5 rounded hover:border-accent-blue hover:text-white transition-all"
            >
              VIEW DEMO FEED
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border-dim bg-bg-secondary/50">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-display font-bold text-3xl text-accent-green glow-green mb-1">
                {stat.value}
              </div>
              <div className="text-text-muted text-xs font-mono uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display font-bold text-4xl text-white mb-3">
              HOW THE SCANNER <span className="text-accent-blue glow-blue">WORKS</span>
            </h2>
            <p className="text-text-secondary">Four layers of intelligence working simultaneously</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-bg-card border border-border-dim rounded-lg p-6 hover:border-border-bright transition-all group"
              >
                <div className={`text-${f.color} mb-4 group-hover:scale-110 transition-transform inline-block`}>
                  {f.icon}
                </div>
                <h3 className="font-display font-bold text-xl text-white mb-2 tracking-wide">{f.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-border-dim">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display font-bold text-4xl text-white mb-4">
            READY TO <span className="text-accent-green glow-green">SCAN?</span>
          </h2>
          <p className="text-text-secondary mb-8">
            Join thousands of users finding profitable opportunities every day.
            Free to start. No credit card required.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-accent-green text-bg-primary font-display font-bold text-xl px-10 py-4 rounded hover:bg-accent-green/90 transition-all hover:shadow-[0_0_40px_rgba(0,255,136,0.4)]"
          >
            CREATE FREE ACCOUNT
            <TrendingUp size={22} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-dim py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-5 h-5 bg-accent-green rounded-sm flex items-center justify-center">
            <Activity size={12} className="text-bg-primary" />
          </div>
          <span className="font-display font-bold text-sm tracking-wider text-white">
            ARBITRAX<span className="text-accent-green">AI</span>
          </span>
        </div>
        <p className="text-text-muted text-xs font-mono">
          © 2026 ArbitraxAI. Always verify opportunities before acting.
        </p>
      </footer>
    </div>
  );
}
