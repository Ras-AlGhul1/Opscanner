'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import OpportunityCard from '@/components/OpportunityCard';
import type { Opportunity } from '@/types';
import { Bookmark, TrendingUp } from 'lucide-react';

export default function SavedPage() {
  const supabase = createClient();
  const [saved, setSaved] = useState<Opportunity[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('saved_opportunities')
      .select('opportunity_id, opportunities(*)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    const opps = (data ?? [])
      .map((row: { opportunity_id: string; opportunities: Opportunity | null }) => row.opportunities)
      .filter(Boolean) as Opportunity[];

    setSaved(opps);
    setSavedIds(new Set(opps.map(o => o.id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchSaved(data.user.id);
      }
    });
  }, []);

  const handleToggleSave = async (opportunityId: string) => {
    if (!userId) return;
    if (savedIds.has(opportunityId)) {
      await supabase.from('saved_opportunities').delete()
        .eq('user_id', userId).eq('opportunity_id', opportunityId);
      setSaved(prev => prev.filter(o => o.id !== opportunityId));
      setSavedIds(prev => { const n = new Set(prev); n.delete(opportunityId); return n; });
    }
  };

  const totalProfit = saved.reduce((s, o) => s + o.estimated_profit, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white tracking-wide flex items-center gap-2">
            <Bookmark size={22} className="text-accent-yellow" />
            SAVED OPPORTUNITIES
          </h1>
          <p className="text-text-muted text-sm font-mono mt-0.5">
            {saved.length} saved · {saved.length > 0 && `$${totalProfit.toLocaleString()} total estimated profit`}
          </p>
        </div>
      </div>

      {/* Stats */}
      {!loading && saved.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6 max-w-sm">
          <div className="bg-bg-card border border-border-dim rounded-lg px-4 py-3 text-center">
            <div className="text-text-muted text-xs font-mono mb-1 flex items-center justify-center gap-1">
              <Bookmark size={11} />Saved
            </div>
            <div className="font-display font-bold text-xl text-accent-yellow">{saved.length}</div>
          </div>
          <div className="bg-bg-card border border-border-dim rounded-lg px-4 py-3 text-center">
            <div className="text-text-muted text-xs font-mono mb-1 flex items-center justify-center gap-1">
              <TrendingUp size={11} />Total Profit
            </div>
            <div className="font-display font-bold text-xl text-accent-green">
              ${totalProfit >= 1000 ? `${(totalProfit / 1000).toFixed(1)}K` : totalProfit.toFixed(0)}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
        </div>
      ) : saved.length === 0 ? (
        <div className="text-center py-24">
          <Bookmark size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="font-display font-bold text-xl text-white mb-2">No Saved Opportunities</h3>
          <p className="text-text-secondary text-sm mb-6">
            Browse the live feed and bookmark opportunities you want to track.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-accent-green text-bg-primary font-display font-bold px-6 py-2.5 rounded-lg hover:bg-accent-green/90 transition-all"
          >
            VIEW LIVE FEED
          </a>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {saved.map(opp => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              isSaved={savedIds.has(opp.id)}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
