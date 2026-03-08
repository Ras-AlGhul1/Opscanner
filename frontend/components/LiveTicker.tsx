'use client';
import { useEffect, useState, useRef } from 'react';
import { TrendingUp, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const CATEGORY_COLORS: Record<string, string> = {
  'Sports Betting':    '#f97316',
  'Crypto Arbitrage':  '#00aaff',
  'Crypto Trade':      '#00ff88',
  'Product Reselling': '#a855f7',
  'Price Mistakes':    '#ff3b3b',
  'Discounts':         '#ffd700',
};

interface TickerItem {
  id: string;
  title: string;
  category: string;
  estimated_profit: number;
}

export default function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('opportunities')
        .select('id, title, category, estimated_profit')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data?.length) setItems([...data, ...data]); // duplicate for seamless loop
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!items.length) return null;

  return (
    <div className="w-full overflow-hidden bg-black/40 border-y border-accent-green/10 py-2.5 relative">
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

      {/* LIVE label */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 bg-bg-primary border border-accent-green/30 px-2.5 py-1 rounded-full">
        <div className="w-1.5 h-1.5 bg-accent-green rounded-full animate-pulse" />
        <span className="text-accent-green text-xs font-mono font-bold tracking-wider">LIVE</span>
      </div>

      <div
        className="flex items-center gap-10 whitespace-nowrap"
        style={{
          animation: 'ticker-scroll 40s linear infinite',
          paddingLeft: '120px',
        }}
      >
        {items.map((item, i) => {
          const profit = item.estimated_profit >= 1000
            ? `$${(item.estimated_profit / 1000).toFixed(1)}K`
            : `$${item.estimated_profit.toFixed(0)}`;
          const color = CATEGORY_COLORS[item.category] ?? '#00ff88';
          return (
            <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2 text-sm font-mono">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-text-muted">{item.category}</span>
              <span className="text-white font-medium">{item.title.length > 50 ? item.title.substring(0, 50) + '…' : item.title}</span>
              <span className="font-bold" style={{ color }}>+{profit}</span>
              <span className="text-border-bright mx-2">·</span>
            </span>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
