'use client';
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Zap, Trophy, BarChart2, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://your-backend.railway.app';

interface Stats {
  totalTrades: number;
  completedTrades: number;
  winRate: number;
  totalPnl: number;
  netPnl: number;
  totalFees: number;
  todayPnl: number;
  byStrategy: { triangular: number; funding: number };
}

interface Position {
  id: string;
  symbol: string;
  direction: string;
  qty: number;
  stake_usdt: number;
  funding_rate: number;
  opened_at: string;
  next_funding: string;
}

export default function PortfolioPage() {
  const supabase = createClient();
  const [stats, setStats]         = useState<Stats | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const headers = { Authorization: `Bearer ${session.access_token}` };
    const [statsRes, posRes] = await Promise.all([
      fetch(`${BACKEND}/api/trades/stats`,     { headers }),
      fetch(`${BACKEND}/api/trades/positions`, { headers }),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (posRes.ok)   setPositions(await posRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(2)}K` : `$${n.toFixed(2)}`;
  const pnlColor = (n: number) => n >= 0 ? 'text-accent-green' : 'text-accent-red';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white tracking-wide flex items-center gap-2 mb-1">
            <BarChart2 size={22} className="text-accent-green" /> PORTFOLIO
          </h1>
          <p className="text-text-muted text-sm font-mono">Your auto-trade performance</p>
        </div>
        <button onClick={load} className="text-text-muted hover:text-white transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && <div className="text-text-muted text-sm font-mono text-center py-12">Loading portfolio...</div>}

      {!loading && !stats && (
        <div className="text-center py-16 bg-bg-card border border-border-dim rounded-xl">
          <Zap size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-white font-display font-bold mb-1">No trades yet</p>
          <p className="text-text-muted text-sm font-mono">Set up auto-trade and your portfolio will appear here.</p>
        </div>
      )}

      {!loading && stats && (
        <div className="space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total P&L',    value: fmt(stats.totalPnl),  color: pnlColor(stats.totalPnl),  icon: DollarSign },
              { label: "Today's P&L",  value: fmt(stats.todayPnl),  color: pnlColor(stats.todayPnl),  icon: TrendingUp },
              { label: 'Win Rate',     value: `${stats.winRate}%`,  color: 'text-accent-blue',         icon: Trophy },
              { label: 'Total Trades', value: stats.totalTrades,    color: 'text-white',               icon: BarChart2 },
            ].map((s, i) => (
              <div key={i} className="bg-bg-card border border-border-dim rounded-xl p-4 text-center">
                <s.icon size={16} className={`${s.color} mx-auto mb-2`} />
                <div className={`font-display font-bold text-xl ${s.color}`}>{s.value}</div>
                <div className="text-text-muted text-xs font-mono mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* By strategy */}
          <div className="bg-bg-card border border-border-dim rounded-xl p-5">
            <h2 className="font-display font-bold text-white mb-4">P&L by Strategy</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-accent-blue/20 bg-accent-blue/5 rounded-xl p-4">
                <div className="text-accent-blue text-xs font-mono uppercase tracking-wider mb-2">Triangular Arb</div>
                <div className={`font-display font-bold text-2xl ${pnlColor(stats.byStrategy.triangular)}`}>
                  {fmt(stats.byStrategy.triangular)}
                </div>
                <div className="text-text-muted text-xs font-mono mt-1">Binance</div>
              </div>
              <div className="border border-accent-green/20 bg-accent-green/5 rounded-xl p-4">
                <div className="text-accent-green text-xs font-mono uppercase tracking-wider mb-2">Funding Rate</div>
                <div className={`font-display font-bold text-2xl ${pnlColor(stats.byStrategy.funding)}`}>
                  {fmt(stats.byStrategy.funding)}
                </div>
                <div className="text-text-muted text-xs font-mono mt-1">Bybit</div>
              </div>
            </div>
          </div>

          {/* Fees */}
          <div className="bg-bg-card border border-border-dim rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-text-muted text-xs font-mono uppercase tracking-wider">Platform Fees Paid</div>
              <div className="text-white font-display font-bold text-lg mt-1">{fmt(stats.totalFees)}</div>
            </div>
            <div className="text-right">
              <div className="text-text-muted text-xs font-mono uppercase tracking-wider">Net P&L (after fees)</div>
              <div className={`font-display font-bold text-lg mt-1 ${pnlColor(stats.netPnl)}`}>{fmt(stats.netPnl)}</div>
            </div>
          </div>

          {/* Open positions */}
          {positions.length > 0 && (
            <div className="bg-bg-card border border-border-dim rounded-xl p-5">
              <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
                <Zap size={16} className="text-accent-green animate-pulse" /> Open Positions ({positions.length})
              </h2>
              <div className="space-y-3">
                {positions.map(pos => {
                  const ageH = ((Date.now() - new Date(pos.opened_at).getTime()) / 3600000).toFixed(1);
                  const nextH = pos.next_funding ? ((new Date(pos.next_funding).getTime() - Date.now()) / 3600000).toFixed(1) : '—';
                  const estFunding = parseFloat(String(pos.stake_usdt)) * Math.abs(parseFloat(String(pos.funding_rate)));
                  return (
                    <div key={pos.id} className="border border-border-dim rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm font-mono font-bold">{pos.symbol}</div>
                        <div className="text-text-muted text-xs font-mono">{pos.direction} · {ageH}h open · Next funding: {nextH}h</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-sm font-mono">${parseFloat(String(pos.stake_usdt)).toFixed(0)}</div>
                        <div className="text-accent-green text-xs font-mono">+${estFunding.toFixed(4)} est.</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
