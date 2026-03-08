'use client';
import { useEffect, useState } from 'react';
import { Trophy, Zap, ExternalLink, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { Opportunity } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  'Sports Betting':    'text-accent-orange',
  'Crypto Arbitrage':  'text-accent-blue',
  'Crypto Trade':      'text-accent-green',
  'Product Reselling': 'text-accent-purple',
  'Price Mistakes':    'text-accent-red',
  'Discounts':         'text-accent-yellow',
};

export default function OpportunityOfDay() {
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      // Try opportunity_of_day table first
      const today = new Date().toISOString().split('T')[0];
      const { data: ootd } = await supabase
        .from('opportunity_of_day')
        .select('opportunity_id')
        .eq('date', today)
        .single();

      if (ootd?.opportunity_id) {
        const { data } = await supabase
          .from('opportunities')
          .select('*')
          .eq('id', ootd.opportunity_id)
          .single();
        if (data) { setOpp(data); setLoading(false); return; }
      }

      // Fallback: highest confidence today
      const { data } = await supabase
        .from('opportunities')
        .select('*')
        .order('confidence_score', { ascending: false })
        .order('estimated_profit', { ascending: false })
        .limit(1)
        .single();

      setOpp(data ?? null);
      setLoading(false);
    };
    load();
  }, []);

  if (loading || !opp) return null;

  const profit = opp.estimated_profit >= 1000
    ? `$${(opp.estimated_profit / 1000).toFixed(1)}K`
    : `$${opp.estimated_profit.toFixed(0)}`;
  const catColor = CATEGORY_COLORS[opp.category] ?? 'text-accent-green';

  return (
    <div className="relative rounded-2xl overflow-hidden border border-accent-yellow/30 bg-gradient-to-br from-accent-yellow/5 via-bg-card to-bg-card mb-4">
      {/* Glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent-yellow/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-accent-yellow" />
          <span className="text-accent-yellow text-xs font-mono font-bold uppercase tracking-widest">Opportunity of the Day</span>
          <div className="ml-auto flex items-center gap-1 bg-accent-yellow/10 border border-accent-yellow/20 rounded-full px-2 py-0.5">
            <Zap size={10} className="text-accent-yellow" />
            <span className="text-accent-yellow text-xs font-mono">Top Pick</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-mono mb-1 block ${catColor}`}>{opp.category}</span>
            <h3 className="font-display font-bold text-white text-lg leading-tight mb-2">{opp.title}</h3>
            <p className="text-text-muted text-sm leading-relaxed line-clamp-2">{opp.description}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-accent-yellow font-display font-bold text-3xl leading-none">{profit}</div>
            <div className="text-text-muted text-xs font-mono mt-1">est. profit</div>
            <div className="text-accent-green text-sm font-mono font-bold mt-2">{opp.confidence_score}<span className="text-text-muted text-xs">/100</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-accent-yellow/10">
          <span className="text-text-muted text-xs font-mono flex items-center gap-1">
            <Clock size={11} /> {opp.source}
          </span>
          {opp.source_url && (
            <a href={opp.source_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-accent-yellow text-xs font-mono hover:text-white transition-colors">
              View <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
