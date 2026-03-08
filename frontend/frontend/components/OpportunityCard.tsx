'use client';
import { useState } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, TrendingUp, Clock, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Opportunity } from '@/types';

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  'Sports Betting': { color: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/20', dot: 'bg-accent-orange' },
  'Crypto Arbitrage': { color: 'text-accent-blue', bg: 'bg-accent-blue/10', border: 'border-accent-blue/20', dot: 'bg-accent-blue' },
  'Product Reselling': { color: 'text-accent-purple', bg: 'bg-accent-purple/10', border: 'border-accent-purple/20', dot: 'bg-accent-purple' },
  'Price Mistakes': { color: 'text-accent-red', bg: 'bg-accent-red/10', border: 'border-accent-red/20', dot: 'bg-accent-red' },
  'Discounts': { color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/20', dot: 'bg-accent-yellow' },
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
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface Props {
  opportunity: Opportunity;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  isNew?: boolean;
}

export default function OpportunityCard({ opportunity, isSaved, onToggleSave, isNew }: Props) {
  const [saving, setSaving] = useState(false);
  const cfg = CATEGORY_CONFIG[opportunity.category] ?? CATEGORY_CONFIG['Discounts'];

  const handleSave = async () => {
    setSaving(true);
    await onToggleSave(opportunity.id);
    setSaving(false);
  };

  const profit = opportunity.estimated_profit;
  const profitStr = profit >= 1000
    ? `$${(profit / 1000).toFixed(1)}K`
    : `$${profit.toFixed(0)}`;

  return (
    <div className={`
      opportunity-card bg-bg-card border rounded-xl p-5 relative overflow-hidden
      ${isNew ? 'border-accent-green/40 card-new animate-slide-in' : 'border-border-dim hover:border-border-bright'}
    `}>
      {/* New badge */}
      {isNew && (
        <div className="absolute top-3 right-3">
          <span className="bg-accent-green text-bg-primary text-xs font-mono font-bold px-2 py-0.5 rounded-full badge-pulse">
            NEW
          </span>
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
          <div className="text-accent-green font-display font-bold text-2xl glow-green leading-tight">
            {profitStr}
          </div>
          <div className="text-text-muted text-xs font-mono">est. profit</div>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-display font-bold text-white text-lg leading-tight mb-2 tracking-wide">
        {opportunity.title}
      </h3>

      {/* Description */}
      <p className="text-text-secondary text-sm leading-relaxed mb-4 line-clamp-2">
        {opportunity.description}
      </p>

      {/* Confidence bar */}
      <ConfidenceBar score={opportunity.confidence_score} />

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-dim">
        <div className="flex items-center gap-3 text-xs text-text-muted font-mono">
          <span className="flex items-center gap-1">
            <TrendingUp size={11} />
            {opportunity.source}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatDistanceToNow(new Date(opportunity.created_at), { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {opportunity.source_url && (() => {
            // Fix 7: Only allow http/https URLs — block javascript: data: etc
            try {
              const parsed = new URL(opportunity.source_url);
              if (!['http:', 'https:'].includes(parsed.protocol)) return null;
              return (
                <a
                  href={opportunity.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-text-muted hover:text-accent-blue transition-colors"
                  title="View source"
                >
                  <ExternalLink size={15} />
                </a>
              );
            } catch { return null; }
          })()}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`p-1.5 transition-colors ${isSaved ? 'text-accent-yellow' : 'text-text-muted hover:text-accent-yellow'}`}
            title={isSaved ? 'Remove bookmark' : 'Save opportunity'}
          >
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
