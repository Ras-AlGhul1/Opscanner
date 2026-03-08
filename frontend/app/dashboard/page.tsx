'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import OpportunityCard from '@/components/OpportunityCard';
import type { Opportunity } from '@/types';
import { RefreshCw, Filter, TrendingUp, Zap, Activity } from 'lucide-react';

const CATEGORIES = ['All', 'Sports Betting', 'Crypto Arbitrage', 'Product Reselling', 'Price Mistakes', 'Discounts'];
const REGIONS = ['All', 'Global', 'US', 'UK', 'EU', 'Asia', 'Australia', 'Canada', 'Nigeria'];
const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First' },
  { value: 'profit',     label: 'Highest Profit' },
  { value: 'confidence', label: 'Best Confidence' },
];

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
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('All');
  const [region, setRegion] = useState('All');
  const [sort, setSort] = useState('newest');
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ total: 0, avgProfit: 0, avgConfidence: 0 });
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const prevIdsRef = useRef<Set<string>>(new Set());

  const fetchOpportunities = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      let query = supabase
        .from('opportunities')
        .select('*')
        .order(
          sort === 'profit' ? 'estimated_profit' : sort === 'confidence' ? 'confidence_score' : 'created_at',
          { ascending: false }
        )
        .limit(50);

      if (category !== 'All') query = query.eq('category', category);
      if (region !== 'All') query = query.eq('region', region);

      const { data: rows } = await query;
      const data: Opportunity[] = rows ?? [];

      // Detect new items
      const currentIds = new Set(data.map((o: Opportunity) => o.id));
      const freshIds = new Set<string>();
      if (prevIdsRef.current.size > 0) {
        currentIds.forEach(id => {
          if (!prevIdsRef.current.has(id)) freshIds.add(id);
        });
      }
      prevIdsRef.current = currentIds;
      if (freshIds.size > 0) {
        setNewIds(freshIds);
        setTimeout(() => setNewIds(new Set()), 8000);
      }

      setOpportunities(data);
      if (data.length > 0) {
        setStats({
          total: data.length,
          avgProfit: data.reduce((s, o) => s + o.estimated_profit, 0) / data.length,
          avgConfidence: data.reduce((s, o) => s + o.confidence_score, 0) / data.length,
        });
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, region, sort]);

  const fetchSaved = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('saved_opportunities')
      .select('opportunity_id')
      .eq('user_id', uid);
    setSavedIds(new Set(data?.map(r => r.opportunity_id) ?? []));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchSaved(data.user.id);
      }
    });
  }, []);

  useEffect(() => {
    fetchOpportunities();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchOpportunities(true), 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchOpportunities]);

  const handleToggleSave = async (opportunityId: string) => {
    if (!userId) return;
    if (savedIds.has(opportunityId)) {
      await supabase.from('saved_opportunities').delete()
        .eq('user_id', userId).eq('opportunity_id', opportunityId);
      setSavedIds(prev => { const n = new Set(prev); n.delete(opportunityId); return n; });
    } else {
      await supabase.from('saved_opportunities').insert({ user_id: userId, opportunity_id: opportunityId });
      setSavedIds(prev => new Set(prev).add(opportunityId));
    }
  };

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
          <p className="text-text-muted text-sm font-mono mt-0.5">Auto-refreshes every 30 seconds · Click any card to expand</p>
        </div>
        <button
          onClick={() => fetchOpportunities()}
          className="flex items-center gap-2 border border-border-dim text-text-secondary hover:text-white hover:border-accent-green/50 text-sm px-3 py-2 rounded-lg transition-all font-mono"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {!loading && opportunities.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: <Zap size={14} />, label: 'Found', value: String(stats.total) },
            { icon: <TrendingUp size={14} />, label: 'Avg Profit', value: `$${stats.avgProfit.toFixed(0)}` },
            { icon: <Activity size={14} />, label: 'Avg Score', value: `${stats.avgConfidence.toFixed(0)}/100` },
          ].map((s, i) => (
            <div key={i} className="bg-bg-card border border-border-dim rounded-lg px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1 text-text-muted mb-1">{s.icon}<span className="text-xs font-mono">{s.label}</span></div>
              <div className="font-display font-bold text-xl text-accent-green">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`flex-shrink-0 text-xs font-mono px-3 py-1.5 rounded-lg border transition-all
                ${category === cat
                  ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                  : 'text-text-muted border-border-dim hover:text-white hover:border-border-bright'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Region filter + Sort */}
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-text-muted text-xs font-mono flex-shrink-0">Region:</span>
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {REGIONS.map(r => (
              <button key={r} onClick={() => setRegion(r)}
                className={`flex-shrink-0 text-xs font-mono px-3 py-1.5 rounded-lg border transition-all
                  ${region === r
                    ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
                    : 'text-text-muted border-border-dim hover:text-white hover:border-border-bright'}`}>
                {r === 'All' ? '🌐 All' : r === 'Global' ? '🌐 Global' : r === 'US' ? '🇺🇸 US' : r === 'UK' ? '🇬🇧 UK' : r === 'EU' ? '🇪🇺 EU' : r === 'Asia' ? '🌏 Asia' : r === 'Australia' ? '🇦🇺 AUS' : r === 'Canada' ? '🇨🇦 CA' : r === 'Nigeria' ? '🇳🇬 NG' : r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter size={14} className="text-text-muted" />
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="bg-bg-card border border-border-dim text-text-secondary text-xs font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-green/50 cursor-pointer">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-text-muted text-5xl mb-4">📡</div>
          <h3 className="font-display font-bold text-xl text-white mb-2">No Opportunities Found</h3>
          <p className="text-text-secondary text-sm">Try a different category or region filter.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {opportunities.map(opp => (
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
