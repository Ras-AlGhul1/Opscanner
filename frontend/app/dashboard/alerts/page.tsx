'use client';
import { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, Smartphone, Save, CheckCircle, AlertCircle, Zap, Shield, TrendingUp, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const CATEGORIES = ['Sports Betting', 'Crypto Arbitrage', 'Crypto Trade', 'Product Reselling', 'Price Mistakes', 'Discounts'];
const CATEGORY_COLORS: Record<string, string> = {
  'Sports Betting':    'text-accent-orange border-accent-orange/30 bg-accent-orange/10',
  'Crypto Arbitrage':  'text-accent-blue   border-accent-blue/30   bg-accent-blue/10',
  'Crypto Trade':      'text-accent-green  border-accent-green/30  bg-accent-green/10',
  'Product Reselling': 'text-accent-purple border-accent-purple/30 bg-accent-purple/10',
  'Price Mistakes':    'text-accent-red    border-accent-red/30    bg-accent-red/10',
  'Discounts':         'text-accent-yellow border-accent-yellow/30 bg-accent-yellow/10',
};

interface AlertPrefs {
  email_enabled:       boolean;
  push_enabled:        boolean;
  email_address:       string;
  min_confidence:      number;
  min_profit:          number;
  categories:          string[];
  frequency:           'instant' | 'hourly' | 'daily';
}

const DEFAULT_PREFS: AlertPrefs = {
  email_enabled:  false,
  push_enabled:   false,
  email_address:  '',
  min_confidence: 70,
  min_profit:     100,
  categories:     CATEGORIES,
  frequency:      'instant',
};

export default function AlertsPage() {
  const supabase = createClient();
  const [prefs, setPrefs]           = useState<AlertPrefs>(DEFAULT_PREFS);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [pushStatus, setPushStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown');
  const [userId, setUserId]         = useState('');
  const [userEmail, setUserEmail]   = useState('');
  const [error, setError]           = useState('');

  // ── Load user + prefs ─────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      setUserEmail(data.user.email ?? '');

      // Load saved prefs from Supabase
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('alert_prefs')
        .eq('id', data.user.id)
        .single();

      if (profile?.alert_prefs) {
        setPrefs({ ...DEFAULT_PREFS, ...profile.alert_prefs, email_address: profile.alert_prefs.email_address || data.user.email || '' });
      } else {
        setPrefs(prev => ({ ...prev, email_address: data.user.email ?? '' }));
      }
    });

    // Check push permission status
    if (!('Notification' in window)) {
      setPushStatus('unsupported');
    } else {
      setPushStatus(Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'unknown');
    }
  }, []);

  // ── Request push permission ───────────────────────────────
  const requestPushPermission = async () => {
    if (!('Notification' in window)) { setPushStatus('unsupported'); return; }
    const result = await Notification.requestPermission();
    setPushStatus(result === 'granted' ? 'granted' : 'denied');
    if (result === 'granted') {
      setPrefs(prev => ({ ...prev, push_enabled: true }));
    }
  };

  // ── Toggle category ───────────────────────────────────────
  const toggleCategory = (cat: string) => {
    setPrefs(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  // ── Save prefs ────────────────────────────────────────────
  const savePrefs = async () => {
    if (!userId) return;
    if (prefs.email_enabled && !prefs.email_address) { setError('Please enter an email address.'); return; }
    setError('');
    setSaving(true);
    await supabase.from('user_profiles').upsert({ id: userId, alert_prefs: prefs }, { onConflict: 'id' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // ── Test notification ────────────────────────────────────
  const sendTestNotification = () => {
    if (pushStatus !== 'granted') return;
    new Notification('ArbitraxAI Alert 🎯', {
      body: 'BTC/USDT Arbitrage: Binance → Coinbase — Est. $340 profit',
      icon: '/favicon.svg',
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white tracking-wide flex items-center gap-2 mb-1">
          <Bell size={22} className="text-accent-green" />
          ALERTS
        </h1>
        <p className="text-text-muted text-sm font-mono">Get notified when high-confidence opportunities are detected.</p>
      </div>

      <div className="space-y-4">

        {/* ── Browser Push ── */}
        <div className="bg-bg-card border border-border-dim rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-accent-blue" />
              <span className="font-display font-bold text-white">Browser Push Notifications</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={prefs.push_enabled && pushStatus === 'granted'}
                onChange={() => {
                  if (pushStatus !== 'granted') { requestPushPermission(); return; }
                  setPrefs(prev => ({ ...prev, push_enabled: !prev.push_enabled }));
                }}
              />
              <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-green"></div>
            </label>
          </div>

          {pushStatus === 'unsupported' && (
            <div className="flex items-center gap-2 text-accent-red text-xs font-mono bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> Browser notifications not supported in this browser.
            </div>
          )}
          {pushStatus === 'denied' && (
            <div className="flex items-center gap-2 text-accent-red text-xs font-mono bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> Notifications blocked. Enable them in your browser settings → Site Settings.
            </div>
          )}
          {pushStatus === 'unknown' && (
            <button onClick={requestPushPermission}
              className="text-xs font-mono text-accent-blue border border-accent-blue/30 bg-accent-blue/10 px-3 py-2 rounded-lg hover:bg-accent-blue/20 transition-all">
              Enable browser notifications
            </button>
          )}
          {pushStatus === 'granted' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-green text-xs font-mono">
                <CheckCircle size={13} /> Notifications enabled
              </div>
              <button onClick={sendTestNotification}
                className="text-xs font-mono text-text-muted border border-border-dim px-3 py-1.5 rounded-lg hover:text-white hover:border-border-bright transition-all">
                Send test
              </button>
            </div>
          )}
        </div>

        {/* ── Email ── */}
        <div className="bg-bg-card border border-border-dim rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-accent-purple" />
              <span className="font-display font-bold text-white">Email Alerts</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={prefs.email_enabled}
                onChange={() => setPrefs(prev => ({ ...prev, email_enabled: !prev.email_enabled }))} />
              <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-green"></div>
            </label>
          </div>

          {prefs.email_enabled && (
            <div className="space-y-3">
              <div>
                <label className="text-text-muted text-xs font-mono mb-1 block uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={prefs.email_address}
                  onChange={e => setPrefs(prev => ({ ...prev, email_address: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full bg-bg-secondary border border-border-dim text-white text-sm font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-accent-green/50"
                />
              </div>
              <div>
                <label className="text-text-muted text-xs font-mono mb-1 block uppercase tracking-wider">Frequency</label>
                <select value={prefs.frequency} onChange={e => setPrefs(prev => ({ ...prev, frequency: e.target.value as any }))}
                  className="w-full bg-bg-secondary border border-border-dim text-text-secondary text-sm font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-accent-green/50">
                  <option value="instant">Instant — as soon as detected</option>
                  <option value="hourly">Hourly digest</option>
                  <option value="daily">Daily digest</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Filters ── */}
        <div className="bg-bg-card border border-border-dim rounded-xl p-5 space-y-4">
          <h2 className="font-display font-bold text-white flex items-center gap-2">
            <Shield size={16} className="text-accent-green" /> Alert Filters
          </h2>

          {/* Min confidence */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-text-muted text-xs font-mono uppercase tracking-wider">Min Confidence</label>
              <span className="text-accent-green text-xs font-mono font-bold">{prefs.min_confidence}+</span>
            </div>
            <input type="range" min="0" max="95" step="5" value={prefs.min_confidence}
              onChange={e => setPrefs(prev => ({ ...prev, min_confidence: parseInt(e.target.value) }))}
              className="w-full accent-accent-green" />
            <div className="flex justify-between text-text-muted text-xs font-mono mt-0.5">
              <span>Any</span><span>50</span><span>75</span><span>95+</span>
            </div>
          </div>

          {/* Min profit */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-text-muted text-xs font-mono uppercase tracking-wider">Min Profit</label>
              <span className="text-accent-green text-xs font-mono font-bold">${prefs.min_profit}+</span>
            </div>
            <input type="range" min="0" max="1000" step="50" value={prefs.min_profit}
              onChange={e => setPrefs(prev => ({ ...prev, min_profit: parseInt(e.target.value) }))}
              className="w-full accent-accent-green" />
            <div className="flex justify-between text-text-muted text-xs font-mono mt-0.5">
              <span>$0</span><span>$250</span><span>$500</span><span>$1K+</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="text-text-muted text-xs font-mono uppercase tracking-wider mb-2 block">Alert Categories</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => toggleCategory(cat)}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all
                    ${prefs.categories.includes(cat) ? CATEGORY_COLORS[cat] : 'text-text-muted border-border-dim hover:border-border-bright'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 text-accent-red text-xs font-mono bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {/* ── Save button ── */}
        <button onClick={savePrefs} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-accent-green text-bg-primary font-display font-bold py-3 rounded-xl hover:bg-accent-green/90 transition-all text-sm disabled:opacity-50">
          {saving ? <><Zap size={16} className="animate-spin" /> Saving...</> : saved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save Alert Preferences</>}
        </button>

        <p className="text-text-muted text-xs font-mono text-center">
          Alerts trigger when new opportunities match your filters. Browser alerts work instantly. Email alerts depend on your chosen frequency.
        </p>
      </div>
    </div>
  );
}
