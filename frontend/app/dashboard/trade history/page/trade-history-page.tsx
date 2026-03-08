'use client';
import { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, TrendingUp, RefreshCw, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://your-backend.railway.app';

interface Trade {
  id: string;
  strategy: string;
  exchange: string;
  symbol: string;
  stake_usdt: number;
  pnl_usdt: number;
  net_pnl_usdt: number;
  fee_usdt: number;
  status: string;
  error_message?: string;
  created_at: string;
}

const STRATEGY_COLORS: Record<string, string> = {
  triangular: 'text-accent-blue border-accent-blue/30 bg-accent-blue/10',
  funding:    'text-accent-green border-accent-green/30 bg-accent-green/10',
};

export default function TradeHistoryPage() {
  const supabase = createClient();
  const [trades, setTrades]   = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const res = await fetch(`${BACKEND}/api/trades?limit=100`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setTrades(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white tracking-wide flex items-center gap-2 mb-1">
            <Clock size={22} className="text-accent-green" /> TRADE HISTORY
          </h1>
          <p className="text-text-muted text-sm font-mono">Every auto-executed trade — win or lose</p>
        </div>
        <button onClick={load} className="text-text-muted hover:text-white transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && <div className="text-text-muted text-sm font-mono text-center py-12">Loading trades...</div>}

      {!loading && trades.length === 0 && (
        <div className="text-center py-16 bg-bg-card border border-border-dim rounded-xl">
          <Zap size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-white font-display font-bold mb-1">No trades yet</p>
          <p className="text-text-muted text-sm font-mono">Trades will appear here once the auto-engine executes.</p>
        </div>
      )}

      {!loading && trades.length > 0 && (
        <div className="space-y-2">
          {trades.map(trade => {
            const isWin = trade.net_pnl_usdt > 0;
            const isFail = trade.status === 'failed';
            return (
              <div key={trade.id} className={`bg-bg-card border rounded-xl p-4 flex items-center justify-between gap-4
                ${isFail ? 'border-accent-red/20' : isWin ? 'border-accent-green/20' : 'border-border-dim'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {isFail ? <XCircle size={18} className="text-accent-red flex-shrink-0" /> :
                   isWin  ? <CheckCircle size={18} className="text-accent-green flex-shrink-0" /> :
                   <TrendingUp size={18} className="text-text-muted flex-shrink-0" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${STRATEGY_COLORS[trade.strategy] ?? 'text-text-muted border-border-dim'}`}>
                        {trade.strategy}
                      </span>
                      <span className="text-white text-sm font-mono truncate">{trade.symbol}</span>
                      <span className="text-text-muted text-xs font-mono">{trade.exchange}</span>
                    </div>
                    <div className="text-text-muted text-xs font-mono mt-1 flex items-center gap-3">
                      <span><Clock size={10} className="inline mr-1" />{formatDistanceToNow(new Date(trade.created_at), { addSuffix: true })}</span>
                      <span>Stake: ${parseFloat(String(trade.stake_usdt)).toFixed(2)}</span>
                      {isFail && trade.error_message && <span className="text-accent-red">{trade.error_message.substring(0, 60)}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`font-display font-bold text-lg ${isFail ? 'text-accent-red' : isWin ? 'text-accent-green' : 'text-text-muted'}`}>
                    {isFail ? 'Failed' : `${isWin ? '+' : ''}$${parseFloat(String(trade.net_pnl_usdt)).toFixed(4)}`}
                  </div>
                  {!isFail && (
                    <div className="text-text-muted text-xs font-mono">
                      fee: ${parseFloat(String(trade.fee_usdt)).toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
