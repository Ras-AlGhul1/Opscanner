'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import OpportunityCard from '@/components/OpportunityCard';
import type { Opportunity } from '@/types';
import { RefreshCw, Filter, TrendingUp, Zap, Activity, ChevronDown, X } from 'lucide-react';

const CATEGORIES = ['All', 'Sports Betting', 'Crypto Arbitrage', 'Product Reselling', 'Price Mistakes', 'Discounts'];

const SORT_OPTIONS = [
  { value: 'oldest',     label: 'Oldest First' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'profit',     label: 'Highest Profit' },
  { value: 'confidence', label: 'Best Confidence' },
];

const COUNTRIES = [
  { code: 'All',  label: '🌍 All Countries' },
  { code: 'US',   label: '🇺🇸 United States' },
  { code: 'UK',   label: '🇬🇧 United Kingdom' },
  { code: 'EU',   label: '🇪🇺 Europe' },
  { code: 'AU',   label: '🇦🇺 Australia' },
  { code: 'NG',   label: '🇳🇬 Nigeria' },
  { code: 'CA',   label: '🇨🇦 Canada' },
  { code: 'GLOBAL', label: '🌐 Global / Online' },
];

// ── Platform availability map ─────────────────────────────────────────────
// Each platform lists every country code it operates in.
// This handles multi-country platforms correctly — bet365 appears in UK, EU, AU, NG, CA etc.

const PLATFORM_COUNTRIES: Record<string, string[]> = {
  // ── Sportsbooks ──
  'draftkings':        ['US', 'CA'],
  'fanduel':           ['US', 'CA'],
  'betmgm':            ['US', 'CA', 'UK', 'EU'],
  'caesars':           ['US'],
  'pointsbet':         ['US', 'CA', 'AU'],
  'betrivers':         ['US'],
  'bet365':            ['UK', 'EU', 'AU', 'CA', 'NG', 'GLOBAL'],
  'william hill':      ['UK', 'EU', 'US', 'AU'],
  'williamhill':       ['UK', 'EU', 'US', 'AU'],
  'betfair':           ['UK', 'EU', 'AU'],
  'unibet':            ['UK', 'EU', 'AU', 'CA'],
  'sky bet':           ['UK'],
  'paddy power':       ['UK', 'EU'],
  'coral':             ['UK'],
  'ladbrokes':         ['UK', 'EU', 'AU'],
  'pinnacle':          ['EU', 'GLOBAL'],
  'bwin':              ['EU'],
  'tab':               ['AU'],
  'sportsbet':         ['AU'],
  'neds':              ['AU'],
  'bluebet':           ['AU'],
  'betway':            ['UK', 'EU', 'AU', 'NG', 'CA', 'GLOBAL'],
  'bet9ja':            ['NG'],
  '1xbet':             ['NG', 'EU', 'GLOBAL'],
  'sportybet':         ['NG', 'EU'],
  'betking':           ['NG'],
  'bangbet':           ['NG'],
  'nairabet':          ['NG'],
  'merrybet':          ['NG'],
  'sports interaction':['CA'],
  'bet99':             ['CA'],

  // ── Crypto exchanges (always global) ──
  'binance':           ['US', 'UK', 'EU', 'AU', 'CA', 'NG', 'GLOBAL'],
  'coinbase':          ['US', 'UK', 'EU', 'AU', 'CA', 'GLOBAL'],
  'kraken':            ['US', 'UK', 'EU', 'AU', 'CA', 'GLOBAL'],
  'bybit':             ['UK', 'EU', 'AU', 'NG', 'CA', 'GLOBAL'],
  'okx':               ['UK', 'EU', 'AU', 'NG', 'CA', 'GLOBAL'],

  // ── Retailers ──
  'amazon':            ['US', 'UK', 'EU', 'AU', 'CA', 'GLOBAL'],
  'ebay':              ['US', 'UK', 'EU', 'AU', 'CA', 'GLOBAL'],
  'walmart':           ['US', 'CA'],
  'target':            ['US', 'AU'],
  'best buy':          ['US', 'CA'],
  'costco':            ['US', 'CA', 'UK', 'AU'],
  'newegg':            ['US', 'CA'],
  'slickdeals':        ['US', 'CA', 'GLOBAL'],
  'asos':              ['UK', 'EU', 'AU', 'US', 'CA', 'GLOBAL'],
  'argos':             ['UK'],
  'currys':            ['UK'],
  'john lewis':        ['UK'],
};

// Country filter logic — uses platform map for multi-country support
function matchesCountry(opp: Opportunity, country: string): boolean {
  if (country === 'All') return true;

  // Crypto arbitrage is always globally accessible
  if (opp.category === 'Crypto Arbitrage') return true;

  const source   = (opp.source      || '').toLowerCase();
  const title    = (opp.title       || '').toLowerCase();
  const desc     = (opp.description || '').toLowerCase();
  const combined = `${source} ${title} ${desc}`;

  // Check every known platform against the combined text
  for (const [platform, countries] of Object.entries(PLATFORM_COUNTRIES)) {
    if (combined.includes(platform) && countries.includes(country)) {
      return true;
    }
  }

  // GLOBAL filter shows only platforms explicitly marked global
  if (country === 'GLOBAL') return false;

  // If no known platform matched, include it under All but not specific countries
  return false;
}

function SkeletonCard() {
  return (
    <div className="bg-bg-card border border-border-dim rounded-xl p-5 space-y-4">
      <div className="flex justify-between">
        <div className="skeleton h-6 w-32 rounded-md" />
        <div className="skeleton h-8 w-16 rounded" />
      </div>
      <div className="skeleton h-6 w-3/4 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-4/5 rounded" />
      <div className="skeleton h-1 w-full rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const supabase = createClient();
  const [opportunities, setOpportunities]   = useState<Opportunity[]>([]);
  const [filtered, setFiltered]             = useState<Opportunity[]>([]);
  const [savedIds, setSavedIds]             = useState<Set<string>>(new Set());
  const [userId, setUserId]                 = useState<string>('');
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [category, setCategory]             = useState('All');
  const [sort, setSort]                     = useState('oldest');
  const [country, setCountry]               = useState('All');
  const [minProfit, setMinProfit]           = useState('');
  const [minConfidence, setMinConfidence]   = useState('');
  const [dateFrom, setDateFrom]             = useState('');
  const [dateTo, setDateTo]                 = useState('');
  const [showAdvanced, setShowAdvanced]     = useState(false);
  const [newIds, setNewIds]                 = useState<Set<string>>(new Set());
  const [stats, setStats]                   = useState({ total: 0, avgProfit: 0, avgConfidence: 0 });
  const pollRef    = useRef<ReturnType<typeof setInterval>>();
  const prevIdsRef = useRef<Set<string>>(new Set());

  // ── Fetch from Supabase ───────────────────────────────────────────────────
  const fetchOpportunities = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      let query = supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: sort === 'oldest' })
        .limit(200); // fetch more, filter client-side for country/date

      if (category !== 'All') query = query.eq('category', category);
      if (minConfidence)       query = query.gte('confidence_score', parseInt(minConfidence));
      if (minProfit)           query = query.gte('estimated_profit', parseFloat(minProfit));
      if (dateFrom)            query = query.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo)              query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());

      // Server-side sort for profit/confidence
      if (sort === 'profit')     query = supabase.from('opportunities').select('*').order('estimated_profit', { ascending: false }).limit(200);
      if (sort === 'confidence') query = supabase.from('opportunities').select('*').order('confidence_score',  { ascending: false }).limit(200);

      const { data: rows } = await query;
      const data: Opportunity[] = rows ?? [];

      // Detect new items
      const currentIds = new Set(data.map((o) => o.id));
      const freshIds   = new Set<string>();
      if (prevIdsRef.current.size > 0) {
        currentIds.forEach(id => { if (!prevIdsRef.current.has(id)) freshIds.add(id); });
      }
      prevIdsRef.current = currentIds;
      if (freshIds.size > 0) {
        setNewIds(freshIds);
        setTimeout(() => setNewIds(new Set()), 8000);
      }

      setOpportunities(data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, sort, minConfidence, minProfit, dateFrom, dateTo]);

  // ── Client-side country filter + stats ───────────────────────────────────
  useEffect(() => {
    const result = opportunities.filter(o => matchesCountry(o, country));
    setFiltered(result);

    if (result.length > 0) {
      setStats({
        total: result.length,
        avgProfit:     result.reduce((s, o) => s + o.estimated_profit, 0) / result.length,
        avgConfidence: result.reduce((s, o) => s + o.confidence_score,  0) / result.length,
      });
    } else {
      setStats({ total: 0, avgProfit: 0, avgConfidence: 0 });
    }
  }, [opportunities, country]);

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchSaved(data.user.id);
      }
    });
  }, []);

  const fetchSaved = useCallback(async (uid: string) => {
    const { data } = await supabase.from('saved_opportunities').select('opportunity_id').eq('user_id', uid);
    setSavedIds(new Set(data?.map(r => r.opportunity_id) ?? []));
  }, []);

  // ── Poll ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchOpportunities();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchOpportunities(true), 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchOpportunities]);

  // ── Save toggle ───────────────────────────────────────────────────────────
  const handleToggleSave = async (opportunityId: string) => {
    if (!userId) return;
    if (savedIds.has(opportunityId)) {
      await supabase.from('saved_opportunities').delete().eq('user_id', userId).eq('opportunity_id', opportunityId);
      setSavedIds(prev => { const n = new Set(prev); n.delete(opportunityId); return n; });
    } else {
      await supabase.from('saved_opportunities').insert({ user_id: userId, opportunity_id: opportunityId });
      setSavedIds(prev => new Set(prev).add(opportunityId));
    }
  };

  // ── Reset filters ─────────────────────────────────────────────────────────
  const resetFilters = () => {
    setCategory('All');
    setSort('oldest');
    setCountry('All');
    setMinProfit('');
    setMinConfidence('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = category !== 'All' || sort !== 'oldest' || country !== 'All'
    || minProfit || minConfidence || dateFrom || dateTo;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white tracking-wide flex items-center gap-2">
            <Activity size={22} className="text-accent-green" />
            LIVE FEED
            {refreshing && <RefreshCw size={16} className="animate-spin text-text-muted" />}
          </h1>
          <p className="text-text-muted text-sm font-mono mt-0.5">Auto-refreshes every 30 seconds</p>
        </div>
        <button
          onClick={() => fetchOpportunities()}
          className="flex items-center gap-2 border border-border-dim text-text-secondary hover:text-white hover:border-accent-green/50 text-sm px-3 py-2 rounded-lg transition-all font-mono"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: <Zap size={14} />,        label: 'Found',      value: stats.total,                          suffix: '' },
            { icon: <TrendingUp size={14} />,  label: 'Avg Profit', value: `$${stats.avgProfit.toFixed(0)}`,     suffix: '' },
            { icon: <Activity size={14} />,    label: 'Avg Score',  value: `${stats.avgConfidence.toFixed(0)}`,  suffix: '/100' },
          ].map((s, i) => (
            <div key={i} className="bg-bg-card border border-border-dim rounded-lg px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1 text-text-muted mb-1">
                {s.icon}<span className="text-xs font-mono">{s.label}</span>
              </div>
              <div className="font-display font-bold text-xl text-accent-green">
                {s.value}<span className="text-text-muted text-sm">{s.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-bg-card border border-border-dim rounded-xl p-4 mb-6 space-y-4">

        {/* Row 1: Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 text-xs font-mono px-3 py-1.5 rounded-lg border transition-all
                ${category === cat
                  ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                  : 'text-text-muted border-border-dim hover:text-white hover:border-border-bright'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Row 2: Sort + Country + Advanced toggle */}
        <div className="flex flex-wrap gap-3 items-center">

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-text-muted" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="bg-bg-secondary border border-border-dim text-text-secondary text-xs font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-green/50 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Country */}
          <div className="flex items-center gap-2">
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="bg-bg-secondary border border-border-dim text-text-secondary text-xs font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-green/50 cursor-pointer"
            >
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1 text-xs font-mono px-3 py-1.5 rounded-lg border transition-all
              ${showAdvanced ? 'text-accent-green border-accent-green/30 bg-accent-green/10' : 'text-text-muted border-border-dim hover:text-white'}`}
          >
            Advanced
            <ChevronDown size={12} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {/* Reset */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs font-mono px-3 py-1.5 rounded-lg border border-accent-red/30 text-accent-red hover:bg-accent-red/10 transition-all"
            >
              <X size={11} /> Reset
            </button>
          )}
        </div>

        {/* Row 3: Advanced filters (collapsible) */}
        {showAdvanced && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border-dim">

            <div className="space-y-1">
              <label className="text-text-muted text-xs font-mono uppercase tracking-wider">Min Profit ($)</label>
              <input
                type="number"
                value={minProfit}
                onChange={e => setMinProfit(e.target.value)}
                placeholder="e.g. 100"
                className="w-full bg-bg-secondary border border-border-dim text-text-secondary text-xs font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-green/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-muted text-xs font-mono uppercase tracking-wider">Min Confidence</label>
              <input
                type="number"
                value={minConfidence}
                onChange={e => setMinConfidence(e.target.value)}
                placeholder="e.g. 75"
                min="0"
                max="100"
                className="w-full bg-bg-secondary border border-border-dim text-text-secondary text-xs font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-green/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-muted text-xs font-mono uppercase tracking-wider">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-bg-secondary border border-border-dim text-text-secondary text-xs font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-green/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-muted text-xs font-mono uppercase tracking-wider">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full bg-bg-secondary border border-border-dim text-text-secondary text-xs font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-green/50"
              />
            </div>

          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-text-muted text-5xl mb-4">📡</div>
          <h3 className="font-display font-bold text-xl text-white mb-2">No Opportunities Found</h3>
          <p className="text-text-secondary text-sm">
            {hasActiveFilters
              ? 'Try adjusting your filters or click Reset to clear them.'
              : 'The scanner is running. Check back in 30 seconds.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-4 text-xs font-mono px-4 py-2 rounded-lg border border-accent-green/30 text-accent-green hover:bg-accent-green/10 transition-all"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(opp => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              isSaved={savedIds.has(opp.id)}
              onToggleSave={handleToggleSave}
              isNew={newIds.has(opp.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
