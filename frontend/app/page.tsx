'use client';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import {
  TrendingUp, Zap, Shield, ChevronRight, Activity, DollarSign, Target,
  Clock, Bookmark, RefreshCw, Filter, ArrowRight, AlertTriangle,
  Search, Bell, BarChart2, ChevronDown, Play
} from 'lucide-react';

// ── Simulated demo data ───────────────────────────────────────────────────────
const DEMO_OPPS = [
  {
    id: '1', category: 'Sports Betting', color: '#f97316',
    title: 'Real Arbitrage: Lakers vs Celtics (NBA)',
    description: 'DraftKings offers Lakers at +155 and FanDuel offers Celtics at -130. 3.8% guaranteed profit — mathematically risk-free on $1,000.',
    profit: 38, confidence: 92, source: 'DraftKings vs FanDuel',
    expires: 14 * 60,
    explanation: 'By placing bets on both sides across DraftKings and FanDuel, the differing odds create a mathematical guarantee of profit regardless of the result. The bookmakers have priced the game differently, leaving a gap you can exploit before they correct it.',
  },
  {
    id: '2', category: 'Crypto Arbitrage', color: '#00aaff',
    title: 'BTC/USDT Arbitrage: Binance → Coinbase',
    description: 'Bitcoin live price: $67,240. 0.42% spread — Binance at $67,098 vs Coinbase at $67,380. Est. $252 profit on $10k trade after fees.',
    profit: 252, confidence: 88, source: 'Binance / Coinbase',
    expires: 8 * 60,
    explanation: 'BTC/USDT is priced differently across exchanges due to varying liquidity and order flow. Buying on Binance and selling on Coinbase captures the spread as profit. These windows typically close within minutes as arbitrage bots detect them.',
  },
  {
    id: '3', category: 'Price Mistakes', color: '#ff3b3b',
    title: '⚡ Price Error: Dyson V15 at $89',
    description: 'Dyson V15 Detect vacuum listed at $89 on Amazon Warehouse (MSRP $749). Likely pricing error. Cancel-friendly — buy before correction.',
    profit: 620, confidence: 54, source: 'Amazon Warehouse',
    expires: 4 * 60,
    explanation: 'A pricing error means the retailer accidentally listed this far below actual value. Many retailers honour orders placed before the error is corrected — and since this is Amazon Warehouse, you can cancel if they don\'t.',
  },
  {
    id: '4', category: 'Crypto Trade', color: '#00ff88',
    title: '⚡ ETH Breakout: +2.3% in 1h',
    description: 'Ethereum breaking upward with 2.3% movement in the last hour. Current price: $3,412. Breakout signals often continue in the same direction.',
    profit: 184, confidence: 71, source: 'CoinGecko Market Data',
    expires: 22 * 60,
    explanation: 'ETH is breaking out with strong volume. Breakouts with volume confirmation often lead to sustained moves in the breakout direction. The signal is early — most of the move may still be ahead.',
  },
  {
    id: '5', category: 'Discounts', color: '#ffd700',
    title: '40% Off: Sony WH-1000XM5 Headphones',
    description: 'Sony XM5 at $179 on Amazon (was $299). All-time low. Price match available at Best Buy. Prime shipping included.',
    profit: 120, confidence: 94, source: 'Slickdeals',
    expires: null,
    explanation: 'This deal was verified and upvoted by the Slickdeals community. The saving versus paying full price represents real money back in your pocket, or a resell margin if you flip on eBay.',
  },
  {
    id: '6', category: 'Product Reselling', color: '#a855f7',
    title: 'Nike Dunk Low Panda — Resell Opportunity',
    description: 'Nike SNKRS raffle for Dunk Low Panda ($110). StockX market value $285. After fees: ~$155 profit. Enter raffle before 11:59PM EST.',
    profit: 155, confidence: 68, source: 'Nike SNKRS',
    expires: 3 * 3600,
    explanation: 'This shoe sells at retail but trades significantly higher on the secondary market. Entering the raffle costs nothing — if you win, you buy at $110 and flip on StockX for ~$285 after fees.',
  },
];

const TICKER_ITEMS = [
  { label: 'BTC/ETH Arb', profit: '+$847', cat: 'CRYPTO', color: '#00aaff' },
  { label: 'Lakers -3.5 Hedge', profit: '+$234', cat: 'SPORTS', color: '#f97316' },
  { label: 'PS5 Restock Flip', profit: '+$120', cat: 'RESELL', color: '#a855f7' },
  { label: 'SOL/USDC Arb', profit: '+$1,204', cat: 'CRYPTO', color: '#00aaff' },
  { label: 'Price Error: RTX 4090', profit: '+$680', cat: 'DEAL', color: '#ff3b3b' },
  { label: 'MLS Arbitrage', profit: '+$312', cat: 'SPORTS', color: '#f97316' },
  { label: 'ETH Breakout Signal', profit: '+$184', cat: 'TRADE', color: '#00ff88' },
  { label: 'Sony XM5 40% Off', profit: '+$120', cat: 'DISC', color: '#ffd700' },
];

const STEPS = [
  { n: '01', icon: <Search size={22} />, color: '#00ff88', title: 'Scanner Detects',
    desc: 'Every 5 minutes, ArbitraxAI pulls live data from sportsbooks (The Odds API), crypto exchanges (CoinGecko), and deal platforms (Slickdeals). Hundreds of signals processed simultaneously.' },
  { n: '02', icon: <BarChart2 size={22} />, color: '#00aaff', title: 'AI Scores Each Signal',
    desc: 'Each signal gets a confidence score 0–100 based on profit size, execution window, source reliability, and category-specific risk. Only actionable signals reach your feed.' },
  { n: '03', icon: <Bell size={22} />, color: '#f97316', title: 'You Get Alerted',
    desc: 'Opportunities appear instantly in your Live Feed with a countdown timer. Enable push notifications and get pinged the moment a 75%+ confidence opportunity drops.' },
  { n: '04', icon: <DollarSign size={22} />, color: '#ffd700', title: 'You Act & Profit',
    desc: 'Use the built-in Profit Calculator to size your position. Click through to the source and execute. Rate the outcome to help the community calibrate future signals.' },
];

const CATS = [
  { icon: '🏈', name: 'Sports Betting', color: '#f97316',
    what: 'Cross-book arbitrage on live sports odds',
    how: 'When two bookmakers price opposite sides of the same game differently, you can bet both sides and guarantee a profit regardless of the result. We detect these gaps across DraftKings, FanDuel, bet365, and 20+ other books.',
    risk: 'Low — mathematically guaranteed if executed correctly', window: '5–15 minutes before odds adjust' },
  { icon: '₿', name: 'Crypto Arbitrage', color: '#00aaff',
    what: 'Same coin, different price on different exchanges',
    how: 'Buy on the cheaper exchange, sell on the more expensive one. We monitor Binance, Coinbase, Kraken, Bybit, and OKX simultaneously for price discrepancies worth executing.',
    risk: 'Low–Medium — network transfer time is the main risk', window: '8–20 minutes before bots close the spread' },
  { icon: '📈', name: 'Crypto Trade', color: '#00ff88',
    what: 'Momentum, dip-buy, and breakout signals',
    how: 'When a coin moves sharply, it often continues before the broader market reacts. We identify trend-following, dip-buy, and breakout signals using live price and volume data from CoinGecko.',
    risk: 'Medium — directional trades carry market risk', window: '20 minutes to a few hours' },
  { icon: '⚡', name: 'Price Mistakes', color: '#ff3b3b',
    what: 'Retailer pricing errors worth exploiting',
    how: 'Retailers occasionally list items far below their actual value due to typos or system errors. Many honour these prices when orders are placed fast. We scan major retailers continuously for pricing anomalies.',
    risk: 'Medium — retailer may cancel the order', window: '4–30 minutes before the error is fixed' },
  { icon: '🏷️', name: 'Discounts', color: '#ffd700',
    what: 'Verified community-confirmed deals',
    how: 'Pulled directly from Slickdeals RSS — a community of millions that upvotes and verifies real discounts. These are confirmed below-market prices, not automated guesses.',
    risk: 'Very Low — community verified', window: 'Hours to days' },
  { icon: '📦', name: 'Product Reselling', color: '#a855f7',
    what: 'Limited items worth flipping on secondary markets',
    how: 'Sneakers, electronics, collectibles, and limited releases that retail below their secondary market value. We track restocks, drops, and raffle windows across Nike, Supreme, and other sources.',
    risk: 'Low–Medium — depends on secondary market demand', window: 'Hours to days' },
];

const HOW_TO_USE = [
  { n: '1', title: 'Set your country filter', desc: 'Select your country so you only see opportunities on platforms that operate in your region. Nigeria, UK, US, EU, Australia and Canada are all supported with region-specific bookmakers and exchanges.' },
  { n: '2', title: 'Pick your categories', desc: "Focus on categories matching your skills. New to this? Start with Discounts (lowest risk) or Crypto Arbitrage. More experienced? Add Sports Betting and Price Mistakes." },
  { n: '3', title: 'Watch the countdown timers', desc: 'Every card shows a live timer. Sports and crypto windows close in minutes. Prioritise cards with urgent timers and high confidence scores first.' },
  { n: '4', title: 'Use the profit calculator', desc: "Expand any card and tap 'Calculate my profit'. Enter your stake to see your exact estimated return — including fee adjustments — before committing any money." },
  { n: '5', title: 'Enable push alerts', desc: "Go to the Alerts page and enable browser notifications. You'll get a ping whenever a 75%+ confidence opportunity is detected, even when the app is in the background." },
  { n: '6', title: 'Rate what you try', desc: 'After acting on an opportunity, give it a thumbs up or down. This helps the community know what\'s actually working in real time and improves future signal quality.' },
];

// ── Demo Card Component ───────────────────────────────────────────────────────
function DemoCard({ opp, delay = 0 }: { opp: typeof DEMO_OPPS[0]; delay?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [secs, setSecs] = useState(opp.expires);

  useEffect(() => {
    if (!opp.expires) return;
    const t = setInterval(() => setSecs(s => s !== null ? Math.max(0, s - 1) : null), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
    return `${sec}s`;
  };

  const urgent = secs !== null && secs < 5 * 60;
  const profitStr = opp.profit >= 1000 ? `$${(opp.profit / 1000).toFixed(1)}K` : `$${opp.profit}`;
  const scoreColor = opp.confidence >= 80 ? '#00ff88' : opp.confidence >= 60 ? '#00aaff' : opp.confidence >= 40 ? '#ffd700' : '#ff3b3b';

  return (
    <div
      className="bg-bg-card border border-border-dim rounded-xl p-5 cursor-pointer transition-all duration-200 hover:border-border-bright hover:-translate-y-0.5"
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono px-2.5 py-1 rounded-md border"
            style={{ color: opp.color, background: opp.color + '18', borderColor: opp.color + '40' }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: opp.color }} />
            {opp.category}
          </span>
          {secs !== null && (
            <span className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full border ${urgent ? 'animate-pulse' : ''}`}
              style={urgent ? { color: '#ff3b3b', background: '#ff3b3b18', borderColor: '#ff3b3b40' }
                           : { color: '#ffd700', background: '#ffd70018', borderColor: '#ffd70040' }}>
              <Clock size={9} /> {fmt(secs)}
            </span>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-2xl leading-tight" style={{ color: '#00ff88', textShadow: '0 0 10px #00ff8855' }}>{profitStr}</div>
          <div className="text-text-muted text-xs font-mono">est. profit</div>
        </div>
      </div>

      <h3 className="font-bold text-white text-base leading-tight mb-2">{opp.title}</h3>
      <p className={`text-text-secondary text-sm leading-relaxed mb-4 ${expanded ? '' : 'line-clamp-2'}`}>{opp.description}</p>

      {expanded && (
        <div className="mb-4 p-4 rounded-lg border" style={{ borderColor: '#00ff8830', background: '#00ff8808' }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 mb-2">
            <Zap size={12} style={{ color: '#00ff88' }} />
            <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: '#00ff88' }}>Why This Is Profitable</span>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-3">{opp.explanation}</p>
          <div className="pt-3 border-t border-border-dim">
            <p className="text-text-muted text-xs font-mono text-center">🔒 Sign up free to use the Profit Calculator & enable push alerts</p>
          </div>
        </div>
      )}

      <div className="space-y-1 mb-4">
        <div className="flex justify-between">
          <span className="text-text-muted text-xs font-mono flex items-center gap-1"><Shield size={10} /> Confidence</span>
          <span className="text-xs font-mono font-bold" style={{ color: scoreColor }}>{opp.confidence}</span>
        </div>
        <div className="h-1 bg-bg-secondary rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${opp.confidence}%`, background: scoreColor }} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border-dim">
        <span className="text-text-muted text-xs font-mono flex items-center gap-1"><TrendingUp size={10} /> {opp.source}</span>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); setSaved(!saved); }}
            className={`p-1.5 transition-colors ${saved ? 'text-yellow-400' : 'text-text-muted hover:text-yellow-400'}`}>
            <Bookmark size={14} />
          </button>
          <ChevronDown size={14} className={`text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [activeCat, setActiveCat] = useState(0);
  const [demoVisible, setDemoVisible] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setDemoVisible(true); }, { threshold: 0.1 });
    if (demoRef.current) obs.observe(demoRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary scanlines overflow-x-hidden">
      <style>{`
        @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes ticker-scroll-slow { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-dim bg-bg-primary/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <img src="/logo.svg" alt="ArbitraxAI" className="h-7 w-auto" />
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-text-secondary hover:text-white text-sm transition-colors px-3 py-1.5">Login</Link>
            <Link href="/auth/signup" className="bg-accent-green text-bg-primary text-sm font-bold px-4 py-1.5 rounded hover:bg-accent-green/90 transition-all">GET ACCESS</Link>
          </div>
        </div>
      </nav>

      {/* Top ticker */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-bg-secondary border-b border-border-dim overflow-hidden h-8 flex items-center">
        <div className="flex-shrink-0 bg-accent-green text-bg-primary text-xs font-mono font-bold px-3 h-full flex items-center tracking-wider">LIVE</div>
        <div className="overflow-hidden flex-1 relative">
          <div className="flex gap-8 whitespace-nowrap" style={{ animation: 'ticker-scroll 30s linear infinite' }}>
            {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <div key={i} className="inline-flex items-center gap-2 text-xs flex-shrink-0">
                <span className="text-text-muted font-mono">[{item.cat}]</span>
                <span className="text-text-secondary">{item.label}</span>
                <span className="font-mono font-bold" style={{ color: item.color }}>{item.profit}</span>
                <span className="text-border-bright mx-1">◆</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-36 pb-20 px-4 relative">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#1e2d3d 1px, transparent 1px), linear-gradient(90deg, #1e2d3d 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-32 left-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-48 right-1/4 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-accent-green/10 border border-accent-green/20 rounded-full px-4 py-1.5 mb-8">
            <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
            <span className="text-accent-green text-xs font-mono tracking-widest">SCANNER ACTIVE — 2,847 OPPORTUNITIES FOUND TODAY</span>
          </div>
          <h1 className="font-display text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight tracking-wide">
            FIND PROFIT<br /><span className="text-accent-green glow-green">BEFORE ANYONE ELSE</span>
          </h1>
          <p className="text-text-secondary text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Real-time scanner that monitors sportsbooks, crypto exchanges, and retail platforms to surface arbitrage opportunities and price mistakes the moment they appear.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="#demo" className="flex items-center gap-2 bg-accent-green text-bg-primary font-display font-bold text-lg px-8 py-3.5 rounded hover:bg-accent-green/90 transition-all hover:shadow-[0_0_30px_rgba(0,255,136,0.3)]">
              <Play size={18} /> SEE LIVE DEMO
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border-dim bg-bg-secondary/50">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { v: '2,847', l: 'Opportunities Today', i: <Zap size={16} /> },
            { v: '$1.2M', l: 'Est. Profit Discovered', i: <DollarSign size={16} /> },
            { v: '94%', l: 'Scanner Accuracy', i: <Target size={16} /> },
            { v: '<5min', l: 'Scan Interval', i: <Clock size={16} /> },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="flex justify-center text-text-muted mb-1">{s.i}</div>
              <div className="font-display font-bold text-3xl text-accent-green glow-green mb-1">{s.v}</div>
              <div className="text-text-muted text-xs font-mono uppercase tracking-wider">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* What Is It */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-4xl text-white mb-4">WHAT IS <span className="text-accent-green glow-green">ARBITRAXAI?</span></h2>
            <p className="text-text-secondary text-lg leading-relaxed">
              ArbitraxAI is a real-time profit opportunity scanner. It continuously monitors live data from sportsbooks, cryptocurrency exchanges, and retail deal platforms — then surfaces the most actionable opportunities directly to your feed before the windows close.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {[
              { icon: '🔎', title: 'We do the monitoring', desc: "Instead of manually watching 20+ platforms simultaneously, ArbitraxAI does it for you. Every 5 minutes, the scanner pulls live data and processes hundreds of signals." },
              { icon: '🧠', title: 'We score the signals', desc: "Not all opportunities are equal. Every signal gets a confidence score based on profit size, execution window, source reliability, and category-specific risk factors." },
              { icon: '⚡', title: 'You act first', desc: "You see the opportunity the moment it's detected — with a live countdown, direct source link, and a profit calculator to size your position. Speed is everything." },
            ].map((c, i) => (
              <div key={i} className="bg-bg-card border border-border-dim rounded-xl p-6 text-center hover:border-border-bright transition-all">
                <div className="text-4xl mb-3">{c.icon}</div>
                <h3 className="font-display font-bold text-white text-lg mb-2">{c.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-bg-card border border-accent-yellow/20 rounded-xl p-5 flex gap-3">
            <AlertTriangle size={18} className="text-accent-yellow flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-sm font-bold mb-1">Important Disclaimer</p>
              <p className="text-text-secondary text-sm leading-relaxed">
                All profit estimates are projections, not guarantees. Arbitrage windows can close before you execute. Crypto transfers carry timing risk. Price mistakes may be cancelled by retailers. Always verify independently before committing funds. Never risk money you cannot afford to lose.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-bg-secondary/30 border-y border-border-dim">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-4xl text-white mb-3">HOW THE SCANNER <span className="text-accent-blue glow-blue">WORKS</span></h2>
            <p className="text-text-secondary">From raw market data to your feed in under 5 minutes</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => (
              <div key={i} className="bg-bg-card border border-border-dim rounded-xl p-5 relative hover:border-border-bright transition-all">
                <div className="text-5xl font-display font-bold mb-3 opacity-20" style={{ color: s.color }}>{s.n}</div>
                <div className="mb-3" style={{ color: s.color }}>{s.icon}</div>
                <h3 className="font-display font-bold text-white text-base mb-2">{s.title}</h3>
                <p className="text-text-secondary text-xs leading-relaxed">{s.desc}</p>
                {i < 3 && <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10"><ArrowRight size={14} className="text-border-bright" /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-4xl text-white mb-3">THE <span className="text-accent-orange glow-orange">6 CATEGORIES</span> EXPLAINED</h2>
            <p className="text-text-secondary">Understand what each opportunity type is and how to act on it</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {CATS.map((c, i) => (
              <button key={i} onClick={() => setActiveCat(i)}
                className="flex-shrink-0 text-xs font-mono px-3 py-2 rounded-lg border transition-all"
                style={activeCat === i ? { color: c.color, background: c.color + '18', borderColor: c.color + '40' } : { color: '#4a5568', borderColor: '#1e2d3d' }}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
          {(() => {
            const c = CATS[activeCat];
            return (
              <div className="bg-bg-card border rounded-xl p-6" style={{ borderColor: c.color + '40' }}>
                <div className="flex items-start gap-4 mb-5">
                  <div className="text-4xl">{c.icon}</div>
                  <div>
                    <h3 className="font-display font-bold text-xl mb-1" style={{ color: c.color }}>{c.name}</h3>
                    <p className="text-text-secondary text-sm">{c.what}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {[{ l: 'How It Works', v: c.how }, { l: 'Risk Level', v: c.risk }, { l: 'Typical Window', v: c.window }].map((x, i) => (
                    <div key={i} className="bg-bg-secondary rounded-lg p-4">
                      <div className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">{x.l}</div>
                      <p className="text-text-secondary text-sm leading-relaxed">{x.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* How To Use */}
      <section className="py-20 px-4 bg-bg-secondary/30 border-y border-border-dim">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-4xl text-white mb-3">HOW TO <span className="text-accent-green glow-green">USE IT</span></h2>
            <p className="text-text-secondary">A step-by-step guide to getting the most out of ArbitraxAI</p>
          </div>
          <div className="space-y-3">
            {HOW_TO_USE.map((s, i) => (
              <div key={i} className="bg-bg-card border border-border-dim rounded-xl p-5 flex gap-4 hover:border-border-bright transition-all">
                <div className="w-8 h-8 rounded-full bg-accent-green/10 border border-accent-green/20 flex items-center justify-center flex-shrink-0 text-accent-green font-mono font-bold text-sm">{s.n}</div>
                <div>
                  <h4 className="font-display font-bold text-white mb-1">{s.title}</h4>
                  <p className="text-text-secondary text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo */}
      <section id="demo" ref={demoRef} className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-accent-green/10 border border-accent-green/20 rounded-full px-4 py-1.5 mb-6">
              <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
              <span className="text-accent-green text-xs font-mono tracking-widest">SIMULATED DEMO — REAL INTERFACE</span>
            </div>
            <h2 className="font-display font-bold text-4xl text-white mb-3">THIS IS WHAT YOUR <span className="text-accent-green glow-green">LIVE FEED LOOKS LIKE</span></h2>
            <p className="text-text-secondary max-w-2xl mx-auto">Click any card to expand it. The countdown timers are live. All data is simulated to show the real interface.</p>
          </div>

          {/* Simulated toolbar */}
          <div className="bg-bg-card border border-border-dim rounded-xl p-4 mb-4">
            <div className="flex flex-wrap gap-2 mb-3 overflow-x-auto">
              {['All', 'Sports Betting', 'Crypto Arbitrage', 'Crypto Trade', 'Price Mistakes', 'Discounts', 'Product Reselling'].map((cat, i) => (
                <span key={i} className={`flex-shrink-0 text-xs font-mono px-3 py-1.5 rounded-lg border ${i === 0 ? 'bg-accent-green/10 text-accent-green border-accent-green/30' : 'text-text-muted border-border-dim'}`}>{cat}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 items-center text-xs font-mono">
              <span className="flex items-center gap-2 text-text-muted border border-border-dim rounded-lg px-3 py-1.5"><Filter size={11} /> Oldest First</span>
              <span className="text-text-muted border border-border-dim rounded-lg px-3 py-1.5">🌍 All Countries</span>
              <span className="text-text-muted border border-border-dim rounded-lg px-3 py-1.5">Advanced ▾</span>
              <span className="ml-auto flex items-center gap-2 text-accent-green border border-accent-green/30 bg-accent-green/10 rounded-lg px-3 py-1.5"><RefreshCw size={11} /> Auto-refreshing every 30s</span>
            </div>
          </div>

          {/* Ticker */}
          <div className="mb-5 rounded-xl overflow-hidden border border-border-dim">
            <div className="w-full overflow-hidden bg-black/40 border-y border-accent-green/10 py-2.5 relative">
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-bg-card to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-bg-card to-transparent z-10 pointer-events-none" />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 bg-bg-primary border border-accent-green/30 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-accent-green rounded-full animate-pulse" />
                <span className="text-accent-green text-xs font-mono font-bold tracking-wider">LIVE</span>
              </div>
              <div className="flex items-center gap-10 whitespace-nowrap" style={{ animation: 'ticker-scroll 35s linear infinite', paddingLeft: '120px' }}>
                {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-2 text-sm font-mono">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-text-muted">[{item.cat}]</span>
                    <span className="text-white">{item.label}</span>
                    <span className="font-bold" style={{ color: item.color }}>{item.profit}</span>
                    <span className="text-border-bright mx-2">·</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className={`grid sm:grid-cols-2 xl:grid-cols-3 gap-4 transition-all duration-700 ${demoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {DEMO_OPPS.map((opp, i) => <DemoCard key={opp.id} opp={opp} delay={i * 80} />)}
          </div>

          {/* Lock overlay for more cards */}
          <div className="relative mt-4">
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 blur-sm pointer-events-none select-none opacity-60">
              {[1,2,3].map(i => (
                <div key={i} className="bg-bg-card border border-border-dim rounded-xl p-5 h-52">
                  <div className="h-4 w-24 bg-bg-secondary rounded mb-3" />
                  <div className="h-5 w-3/4 bg-bg-secondary rounded mb-2" />
                  <div className="h-4 w-full bg-bg-secondary rounded mb-1" />
                  <div className="h-4 w-4/5 bg-bg-secondary rounded" />
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center bg-bg-secondary/95 border border-accent-green/30 rounded-2xl px-8 py-6 shadow-2xl">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="font-display font-bold text-white text-xl mb-2">More opportunities hidden</h3>
                <p className="text-text-muted text-sm mb-5 max-w-xs">Create a free account to see all live opportunities, use the profit calculator, and enable push alerts.</p>
                <Link href="/auth/signup"
                  className="inline-flex items-center gap-2 bg-accent-green text-bg-primary font-display font-bold px-6 py-2.5 rounded hover:bg-accent-green/90 transition-all">
                  CREATE FREE ACCOUNT <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who Is This For */}
      <section className="py-20 px-4 bg-bg-secondary/30 border-y border-border-dim">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display font-bold text-4xl text-white mb-10">WHO IS THIS FOR?</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: '🎲', t: 'Sports Bettors', d: 'Find guaranteed arbitrage windows across books before odds adjust. Turn betting into a maths problem.' },
              { icon: '💱', t: 'Crypto Traders', d: 'Capture cross-exchange spreads and momentum signals faster than manual monitoring allows.' },
              { icon: '🛍️', t: 'Resellers & Deal Hunters', d: 'Get first alerts on price mistakes, limited drops, and verified deals before stock runs out.' },
              { icon: '📊', t: 'Side Income Seekers', d: 'Arbitrage is one of the few genuinely market-neutral strategies — profit regardless of which side wins.' },
              { icon: '🌍', t: 'International Users', d: 'Country filter shows only opportunities on platforms available in your region including Nigeria, UK, EU, AU.' },
              { icon: '🔔', t: 'Busy Professionals', d: "Can't watch the screen all day? Push alerts mean you never miss a high-confidence window." },
            ].map((c, i) => (
              <div key={i} className="bg-bg-card border border-border-dim rounded-xl p-5 text-left hover:border-border-bright transition-all">
                <div className="text-3xl mb-2">{c.icon}</div>
                <h4 className="font-display font-bold text-white mb-1">{c.t}</h4>
                <p className="text-text-secondary text-sm leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-4">⚡</div>
          <h2 className="font-display font-bold text-4xl text-white mb-4">READY TO START?</h2>
          <p className="text-text-secondary mb-8 leading-relaxed">
            Free to join. No credit card required. The scanner is running right now — every minute you wait is another opportunity that expires without you.
          </p>
          <Link href="/auth/signup"
            className="inline-flex items-center gap-2 bg-accent-green text-bg-primary font-display font-bold text-xl px-10 py-4 rounded hover:bg-accent-green/90 transition-all hover:shadow-[0_0_40px_rgba(0,255,136,0.4)] mb-4">
            CREATE FREE ACCOUNT <TrendingUp size={22} />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            {['✓ Free forever', '✓ No credit card', '✓ 6 opportunity types', '✓ Push alerts included'].map((f, i) => (
              <span key={i} className="text-text-muted text-xs font-mono">{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-dim py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Activity size={13} className="text-accent-green" />
          <span className="font-display font-bold text-sm tracking-wider text-white">ARBITRAX<span className="text-accent-green">AI</span></span>
        </div>
        <p className="text-text-muted text-xs font-mono">© 2026 ArbitraxAI. Always verify opportunities before acting. Not financial advice.</p>
      </footer>
    </div>
  );
}
