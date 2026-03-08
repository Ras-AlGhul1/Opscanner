'use client';
import { useState, useEffect } from 'react';
import { Zap, Shield, AlertTriangle, CheckCircle, Settings, Play, Square, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://your-backend.railway.app';

interface TradingRules {
  strategy:            string[];
  maxTradeUSDT:        number;
  minProfitPct:        number;
  minFundingRatePct:   number;
  dailyLossLimit:      number;
  maxFundingPositions: number;
}

const DEFAULT_RULES: TradingRules = {
  strategy:            ['triangular', 'funding'],
  maxTradeUSDT:        100,
  minProfitPct:        0.15,
  minFundingRatePct:   0.05,
  dailyLossLimit:      50,
  maxFundingPositions: 3,
};

export default function AutoTradePage() {
  const supabase = createClient();
  const [rules, setRules]           = useState<TradingRules>(DEFAULT_RULES);
  const [enabled, setEnabled]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [toggling, setToggling]     = useState(false);
  const [scanning, setScanning]     = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState('');
  const [scanResults, setScanResults] = useState<any>(null);
  const [showBinKey, setShowBinKey] = useState(false);
  const [showBinSec, setShowBinSec] = useState(false);
  const [showByKey, setShowByKey]   = useState(false);
  const [showBySec, setShowBySec]   = useState(false);

  // Exchange keys (never stored in state after save)
  const [binanceKey, setBinanceKey]       = useState('');
  const [binanceSecret, setBinanceSecret] = useState('');
  const [bybitKey, setBybitKey]           = useState('');
  const [bybitSecret, setBybitSecret]     = useState('');
  const [hasKeys, setHasKeys]             = useState({ binance: false, bybit: false });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${BACKEND}/api/trades/rules`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setRules({ ...DEFAULT_RULES, ...data.rules });
          setEnabled(data.enabled ?? false);
          setHasKeys({
            binance: !!(data.exchange_keys?.binanceKey),
            bybit:   !!(data.exchange_keys?.bybitKey),
          });
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setError('');
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const body: any = { rules, enabled };
    if (binanceKey && binanceSecret) { body.binanceKey = binanceKey; body.binanceSecret = binanceSecret; }
    if (bybitKey && bybitSecret)     { body.bybitKey   = bybitKey;   body.bybitSecret   = bybitSecret; }

    const res = await fetch(`${BACKEND}/api/trades/rules`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Failed to save'); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    // Clear key fields after save
    setBinanceKey(''); setBinanceSecret(''); setBybitKey(''); setBybitSecret('');
    if (body.binanceKey) setHasKeys(h => ({ ...h, binance: true }));
    if (body.bybitKey)   setHasKeys(h => ({ ...h, bybit: true }));
  };

  const toggle = async () => {
    setToggling(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const newState = !enabled;
    const res = await fetch(`${BACKEND}/api/trades/rules/toggle`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body:    JSON.stringify({ enabled: newState }),
    });
    if (res.ok) setEnabled(newState);
    setToggling(false);
  };

  const scan = async () => {
    setScanning(true); setScanResults(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`${BACKEND}/api/trades/scan`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setScanResults(res.ok ? data : { error: data.error });
    setScanning(false);
  };

  const toggleStrategy = (s: string) => {
    setRules(r => ({
      ...r,
      strategy: r.strategy.includes(s) ? r.strategy.filter(x => x !== s) : [...r.strategy, s],
    }));
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white tracking-wide flex items-center gap-2 mb-1">
          <Zap size={22} className="text-accent-green" /> AUTO-TRADE
        </h1>
        <p className="text-text-muted text-sm font-mono">Set your rules once. The engine executes automatically.</p>
      </div>

      {/* Status bar */}
      <div className={`flex items-center justify-between p-4 rounded-xl border mb-6 ${enabled ? 'border-accent-green/40 bg-accent-green/5' : 'border-border-dim bg-bg-card'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${enabled ? 'bg-accent-green animate-pulse' : 'bg-text-muted'}`} />
          <div>
            <div className="font-display font-bold text-white">{enabled ? 'ENGINE RUNNING' : 'ENGINE STOPPED'}</div>
            <div className="text-text-muted text-xs font-mono">{enabled ? 'Scanning every 30 seconds' : 'Auto-trading is paused'}</div>
          </div>
        </div>
        <button onClick={toggle} disabled={toggling}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all
            ${enabled ? 'bg-accent-red/10 border border-accent-red/30 text-accent-red hover:bg-accent-red/20' : 'bg-accent-green text-bg-primary hover:bg-accent-green/90'}`}>
          {toggling ? <RefreshCw size={14} className="animate-spin" /> : enabled ? <><Square size={14} /> Stop</> : <><Play size={14} /> Start</>}
        </button>
      </div>

      <div className="space-y-4">
        {/* Strategies */}
        <div className="bg-bg-card border border-border-dim rounded-xl p-5">
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2"><Settings size={16} className="text-accent-green" /> Strategies</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'triangular', label: 'Triangular Arbitrage', sub: 'Binance — 3-leg USDT loops', color: 'text-accent-blue border-accent-blue/30 bg-accent-blue/10' },
              { key: 'funding',    label: 'Funding Rate Arb',     sub: 'Bybit — collect funding fees', color: 'text-accent-green border-accent-green/30 bg-accent-green/10' },
            ].map(s => (
              <button key={s.key} onClick={() => toggleStrategy(s.key)}
                className={`p-4 rounded-xl border text-left transition-all ${rules.strategy.includes(s.key) ? s.color : 'border-border-dim text-text-muted hover:border-border-bright'}`}>
                <div className="font-display font-bold text-sm mb-1">{s.label}</div>
                <div className="text-xs font-mono opacity-70">{s.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Risk limits */}
        <div className="bg-bg-card border border-border-dim rounded-xl p-5 space-y-4">
          <h2 className="font-display font-bold text-white flex items-center gap-2"><Shield size={16} className="text-accent-green" /> Risk Limits</h2>
          {[
            { label: 'Max trade size (USDT)', key: 'maxTradeUSDT',        min: 10,   max: 10000, step: 10,   suffix: '$' },
            { label: 'Min profit per trade',  key: 'minProfitPct',        min: 0.05, max: 2,     step: 0.05, suffix: '%' },
            { label: 'Min funding rate',      key: 'minFundingRatePct',   min: 0.01, max: 1,     step: 0.01, suffix: '%' },
            { label: 'Daily loss limit',      key: 'dailyLossLimit',      min: 10,   max: 5000,  step: 10,   suffix: '$' },
            { label: 'Max funding positions', key: 'maxFundingPositions', min: 1,    max: 10,    step: 1,    suffix: '' },
          ].map(f => (
            <div key={f.key}>
              <div className="flex justify-between mb-1">
                <label className="text-text-muted text-xs font-mono uppercase tracking-wider">{f.label}</label>
                <span className="text-accent-green text-xs font-mono font-bold">{f.suffix}{(rules as any)[f.key]}</span>
              </div>
              <input type="range" min={f.min} max={f.max} step={f.step} value={(rules as any)[f.key]}
                onChange={e => setRules(r => ({ ...r, [f.key]: parseFloat(e.target.value) }))}
                className="w-full accent-accent-green" />
            </div>
          ))}
        </div>

        {/* Exchange keys */}
        <div className="bg-bg-card border border-border-dim rounded-xl p-5 space-y-4">
          <h2 className="font-display font-bold text-white flex items-center gap-2"><Shield size={16} className="text-accent-blue" /> Exchange API Keys</h2>
          <div className="bg-accent-yellow/10 border border-accent-yellow/20 rounded-lg px-3 py-2 text-accent-yellow text-xs font-mono">
            ⚠️ Use read + trade permissions only. Never enable withdrawals on API keys you share with any app.
          </div>

          {/* Binance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-text-muted text-xs font-mono uppercase tracking-wider">Binance</span>
              {hasKeys.binance && <span className="text-accent-green text-xs font-mono flex items-center gap-1"><CheckCircle size={11} /> Connected</span>}
            </div>
            {[
              { label: 'API Key',    val: binanceKey,    set: setBinanceKey,    show: showBinKey, setShow: setShowBinKey },
              { label: 'API Secret', val: binanceSecret, set: setBinanceSecret, show: showBinSec, setShow: setShowBinSec },
            ].map(f => (
              <div key={f.label} className="relative">
                <input type={f.show ? 'text' : 'password'} value={f.val} onChange={e => f.set(e.target.value)}
                  placeholder={hasKeys.binance ? `${f.label} (saved — paste to update)` : f.label}
                  className="w-full bg-bg-secondary border border-border-dim text-white text-sm font-mono rounded-lg px-3 py-2 pr-10 focus:outline-none focus:border-accent-blue/50" />
                <button onClick={() => f.setShow(!f.show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                  {f.show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            ))}
          </div>

          {/* Bybit */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-text-muted text-xs font-mono uppercase tracking-wider">Bybit</span>
              {hasKeys.bybit && <span className="text-accent-green text-xs font-mono flex items-center gap-1"><CheckCircle size={11} /> Connected</span>}
            </div>
            {[
              { label: 'API Key',    val: bybitKey,    set: setBybitKey,    show: showByKey, setShow: setShowByKey },
              { label: 'API Secret', val: bybitSecret, set: setBybitSecret, show: showBySec, setShow: setShowBySec },
            ].map(f => (
              <div key={f.label} className="relative">
                <input type={f.show ? 'text' : 'password'} value={f.val} onChange={e => f.set(e.target.value)}
                  placeholder={hasKeys.bybit ? `${f.label} (saved — paste to update)` : f.label}
                  className="w-full bg-bg-secondary border border-border-dim text-white text-sm font-mono rounded-lg px-3 py-2 pr-10 focus:outline-none focus:border-accent-blue/50" />
                <button onClick={() => f.setShow(!f.show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                  {f.show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-accent-red text-xs font-mono bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        {/* Save */}
        <button onClick={save} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-accent-green text-bg-primary font-display font-bold py-3 rounded-xl hover:bg-accent-green/90 transition-all text-sm">
          {saving ? <><RefreshCw size={16} className="animate-spin" /> Saving...</> : saved ? <><CheckCircle size={16} /> Saved!</> : <><Zap size={16} /> Save Configuration</>}
        </button>

        {/* Manual scan */}
        <button onClick={scan} disabled={scanning || !hasKeys.binance && !hasKeys.bybit}
          className="w-full flex items-center justify-center gap-2 border border-border-dim text-text-muted hover:text-white hover:border-accent-green/40 font-mono text-sm py-3 rounded-xl transition-all">
          {scanning ? <><RefreshCw size={14} className="animate-spin" /> Scanning...</> : <><RefreshCw size={14} /> Preview Live Opportunities</>}
        </button>

        {/* Scan results */}
        {scanResults && (
          <div className="bg-bg-card border border-border-dim rounded-xl p-4 space-y-3">
            <h3 className="font-display font-bold text-white text-sm">Live Scan Results</h3>
            {scanResults.error && <p className="text-accent-red text-xs font-mono">{scanResults.error}</p>}
            {(scanResults.triangular ?? []).map((o: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs font-mono border-b border-border-dim pb-2">
                <span className="text-text-secondary">{o.path}</span>
                <span className="text-accent-green font-bold">+{o.profitPct}%</span>
              </div>
            ))}
            {(scanResults.funding ?? []).map((o: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs font-mono border-b border-border-dim pb-2">
                <span className="text-text-secondary">{o.symbol} — {o.strategy}</span>
                <span className="text-accent-blue font-bold">{o.annualisedPct}% APY</span>
              </div>
            ))}
            {!scanResults.triangular?.length && !scanResults.funding?.length && !scanResults.error && (
              <p className="text-text-muted text-xs font-mono">No opportunities above your thresholds right now.</p>
            )}
          </div>
        )}

        <p className="text-text-muted text-xs font-mono text-center">
          ArbitraxAI charges a 10% platform fee on profitable trades only. No profit = no fee.
        </p>
      </div>
    </div>
  );
}
