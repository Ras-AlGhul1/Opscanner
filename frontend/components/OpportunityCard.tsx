'use client';
import { useState } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, TrendingUp, Clock, Shield, ChevronDown, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Opportunity } from '@/types';

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  'Sports Betting':    { color: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/20', dot: 'bg-accent-orange' },
  'Crypto Arbitrage':  { color: 'text-accent-blue',   bg: 'bg-accent-blue/10',   border: 'border-accent-blue/20',   dot: 'bg-accent-blue' },
  'Product Reselling': { color: 'text-accent-purple',  bg: 'bg-accent-purple/10', border: 'border-accent-purple/20', dot: 'bg-accent-purple' },
  'Price Mistakes':    { color: 'text-accent-red',     bg: 'bg-accent-red/10',    border: 'border-accent-red/20',    dot: 'bg-accent-red' },
  'Discounts':         { color: 'text-accent-yellow',  bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/20', dot: 'bg-accent-yellow' },
};

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 80 ? '#00ff88' : score >= 60 ? '#00aaff' : score >= 40 ? '#ffd700' : '#ff3b3b';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-text-muted text-xs font-mono uppercase tracking-wider flex items-center gap-1">
          <Shield size={11} /> Confidence
        </span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{score}</span>
      </div>
      <div className="h-1 bg-bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// Fallback explanations if not stored on the opportunity
function getFallbackExplanation(opp: Opportunity): string {
  const meta = (opp as any).metadata || {};
  switch (opp.category) {
    case 'Sports Betting':
      if (meta.type === 'arbitrage') return `By placing bets on both sides across ${meta.bookA} and ${meta.bookB}, the differing odds create a mathematical guarantee of profit regardless of the result. The bookmakers have priced the same game differently, leaving a gap you can exploit before they correct it.`;
      if (meta.type === 'over_under') return `Over/Under bets profit when you correctly predict the combined scoring output of a game. Current odds and recent form strongly point toward the ${meta.direction}, making this a high-value play at the current line.`;
      return `This prediction is based on live odds data showing a statistical edge. The model identified a pricing discrepancy that makes this bet more likely to win than the odds suggest, creating positive expected value.`;
    case 'Crypto Arbitrage':
      return `${meta.pair || 'This crypto pair'} is priced differently across exchanges due to varying liquidity. Buying on the cheaper exchange and selling on the more expensive one captures the spread as profit. These gaps typically close within minutes as bots detect them.`;
    case 'Product Reselling':
      return `This product is currently priced below its true market value. Resellers profit by purchasing at this discounted price and listing on secondary marketplaces like eBay or StockX where demand keeps prices higher.`;
    case 'Price Mistakes':
      return `A pricing error means the retailer accidentally listed this far below its actual value. Buyers can purchase at the error price before it is corrected — many retailers honour these orders once placed.`;
    case 'Discounts':
      return `This item is currently ${meta.discountPct ? meta.discountPct + '%' : 'significantly'} below its normal retail price. The profit opportunity comes from savings versus paying full price, or buying to resell closer to the standard retail price.`;
    default:
      return `Breaking news can move markets before prices fully adjust. Acting early gives you an edge before the broader market prices in the new information.`;
  }
}

interface Props {
  opportunity: Opportunity;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  isNew?: boolean;
}

export default function OpportunityCard({ opportunity, isSaved, onToggleSave, isNew }: Props) {
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cfg = CATEGORY_CONFIG[opportunity.category] ?? CATEGORY_CONFIG['Discounts'];

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    await onToggleSave(opportunity.id);
    setSaving(false);
  };

  const handleSourceClick = (e: React.MouseEvent) => e.stopPropagation();

  // Use stored explanation if available, otherwise use fallback template
  const explanation = (opportunity as any).explanation || getFallbackExplanation(opportunity);

  const profit = opportunity.estimated_profit;
  const profitStr = profit >= 1000 ? `$${(profit / 1000).toFixed(1)}K` : `$${profit.toFixed(0)}`;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={`
        opportunity-card bg-bg-card border rounded-xl p-5 relative overflow-hidden cursor-pointer
        transition-all duration-200
        ${isNew ? 'border-accent-green/40 card-new animate-slide-in' : 'border-border-dim hover:border-border-bright'}
        ${expanded ? 'border-accent-green/30' : ''}
      `}
    >
      {/* New badge */}
      {isNew && (
        <div className="absolute top-3 right-3">
          <span className="bg-accent-green text-bg-primary text-xs font-mono font-bold px-2 py-0.5 rounded-full badge-pulse">NEW</span>
        </div>
      )}

      {/* Top row: category + profit */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`category-tag px-2.5 py-1 rounded-md border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} style={{ display: 'inline-block' }} />
            {opportunity.category}
          </span>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-accent-green font-display font-bold text-2xl glow-green leading-tight">{profitStr}</div>
          <div className="text-text-muted text-xs font-mono">est. profit</div>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-display font-bold text-white text-lg leading-tight mb-2 tracking-wide">
        {opportunity.title}
      </h3>

      {/* Description */}
      <p className={`text-text-secondary text-sm leading-relaxed mb-4 ${expanded ? '' : 'line-clamp-2'}`}>
        {opportunity.description}
      </p>

      {/* Why This Is Profitable — shown when expanded, instant (no loading) */}
      {expanded && (
        <div className="mb-4 rounded-lg border border-accent-green/20 bg-accent-green/5 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={13} className="text-accent-green" />
            <span className="text-accent-green text-xs font-mono font-bold uppercase tracking-wider">
              Why This Is Profitable
            </span>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed">{explanation}</p>
        </div>
      )}

      {/* Confidence bar */}
      <ConfidenceBar score={opportunity.confidence_score} />

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-dim">
        <div className="flex items-center gap-3 text-xs text-text-muted font-mono">
          <span className="flex items-center gap-1"><TrendingUp size={11} />{opportunity.source}</span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatDistanceToNow(new Date(opportunity.created_at), { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {opportunity.source_url && (
            <a
              href={opportunity.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSourceClick}
              className="p-1.5 text-text-muted hover:text-accent-blue transition-colors"
              title="View source"
            >
              <ExternalLink size={15} />
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`p-1.5 transition-colors ${isSaved ? 'text-accent-yellow' : 'text-text-muted hover:text-accent-yellow'}`}
            title={isSaved ? 'Remove bookmark' : 'Save opportunity'}
          >
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
          <ChevronDown
            size={15}
            className={`text-text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>
    </div>
  );
}
