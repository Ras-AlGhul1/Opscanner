'use client';
import { useState } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, TrendingUp, Clock, Shield, X, Globe, ChevronRight, DollarSign, BarChart2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { Opportunity } from '@/types';

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  'Sports Betting':   { color: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/20', dot: 'bg-accent-orange' },
  'Crypto Arbitrage': { color: 'text-accent-blue',   bg: 'bg-accent-blue/10',   border: 'border-accent-blue/20',   dot: 'bg-accent-blue' },
  'Product Reselling':{ color: 'text-accent-purple', bg: 'bg-accent-purple/10', border: 'border-accent-purple/20', dot: 'bg-accent-purple' },
  'Price Mistakes':   { color: 'text-accent-red',    bg: 'bg-accent-red/10',    border: 'border-accent-red/20',    dot: 'bg-accent-red' },
  'Discounts':        { color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/20', dot: 'bg-accent-yellow' },
};

const REGION_FLAGS: Record<string, string> = {
  'Global':    '🌐',
  'US':        '🇺🇸',
  'UK':        '🇬🇧',
  'EU':        '🇪🇺',
  'Asia':      '🌏',
  'Australia': '🇦🇺',
  'Canada':    '🇨🇦',
  'Nigeria':   '🇳🇬',
};

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 80 ? '#00ff88' : score >= 60 ? '#00aaff' : score >= 40 ? '#ffd700' : '#ff3b3b';
  const label = score >= 80 ? 'High' : score >= 60 ? 'Medium' : score >= 40 ? 'Low' : 'Very Low';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-text-muted text-xs font-mono uppercase tracking-wider flex items-center gap-1">
          <Shield size={11} /> Confidence
        </span>
        <span className="text-xs font-mono font-bold flex items-center gap-1" style={{ color }}>
          {score} <span className="text-text-muted">/ 100 · {label}</span>
        </span>
      </div>
      <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function safeUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return url;
  } catch { return null; }
}

function OpportunityModal({ opportunity, isSaved, onToggleSave, onClose }: {
  opportunity: Opportunity;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onClose: () => void;
}) {
  const cfg = CATEGORY_CONFIG[opportunity.category] ?? CATEGORY_CONFIG['Discounts'];
  const profit = opportunity.estimated_profit;
  const profitStr = profit >= 1000 ? `$${(profit / 1000).toFixed(2)}K` : `$${profit.toFixed(2)}`;
  const profitMax = profit * 1.8;
  const profitMaxStr = profitMax >= 1000 ? `$${(profitMax / 1000).toFixed(2)}K` : `$${profitMax.toFixed(2)}`;
  const roi = (opportunity.metadata as any)?.roi ?? parseFloat((profit / 10000 * 100).toFixed(2));
  const validUrl = safeUrl(opportunity.source_url);
  const flag = REGION_FLAGS[opportunity.region] ?? '🌐';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-bg-card border border-border-bright rounded-2xl shadow-2xl animate-slide-in overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`h-1 w-full ${cfg.dot}`} />

        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`category-tag px-2.5 py-1 rounded-md border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} style={{ display: 'inline-block' }} />
              {opportunity.category}
            </span>
            <span className="text-xs font-mono bg-bg-secondary border border-border-dim px-2 py-1 rounded-md text-text-secondary">
              {flag} {opportunity.region ?? 'Global'}
            </span>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors ml-2 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-4 flex items-end justify-between">
          <div>
            <div className="text-accent-green font-display font-bold text-4xl glow-green leading-none">{profitStr}<span className="text-2xl text-accent-green/70">–{profitMaxStr}</span></div>
            <div className="text-text-muted text-sm font-mono mt-1">estimated profit range · <span className="text-accent-green">{roi.toFixed(1)}% ROI</span></div>
          </div>
          <div className="text-right">
            <div className="text-text-muted text-xs font-mono mb-1">POSTED</div>
            <div className="text-text-secondary text-sm font-mono">{format(new Date(opportunity.created_at), 'MMM d, yyyy')}</div>
            <div className="text-text-muted text-xs font-mono">{formatDistanceToNow(new Date(opportunity.created_at), { addSuffix: true })}</div>
          </div>
        </div>

        <div className="mx-6 border-t border-border-dim" />

        <div className="p-6 space-y-5">
          <h2 className="font-display font-bold text-xl text-white leading-tight tracking-wide">{opportunity.title}</h2>
          <p className="text-text-secondary text-sm leading-relaxed">{opportunity.description}</p>
          <ConfidenceBar score={opportunity.confidence_score} />

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-secondary border border-border-dim rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-text-muted text-xs font-mono mb-1"><DollarSign size={11} /> Est. Profit</div>
              <div className="text-accent-green font-display font-bold text-lg">{profitStr}–{profitMaxStr}</div>
            </div>
            <div className="bg-bg-secondary border border-border-dim rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-text-muted text-xs font-mono mb-1"><BarChart2 size={11} /> Confidence</div>
              <div className="font-display font-bold text-lg text-white">{opportunity.confidence_score}<span className="text-text-muted text-sm">/100</span></div>
            </div>
          </div>

          <div className="bg-bg-secondary border border-border-dim rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-text-muted text-xs font-mono mb-1"><TrendingUp size={11} /> Source</div>
            <div className="text-text-secondary text-sm">{opportunity.source}</div>
          </div>

          {/* Why this is profitable */}
          {(() => {
            const explanation = (opportunity.metadata as any)?.profitExplanation;
            const autoExplanations: Record<string, string> = {
              'Crypto Arbitrage': 'Price differences for the same asset exist across exchanges due to varying liquidity and order flow. Buying on the cheaper exchange and simultaneously selling on the more expensive one locks in the spread as guaranteed profit before markets re-align.',
              'Sports Betting': 'Different bookmakers calculate odds independently. When their combined implied probabilities fall below 100%, placing proportional bets on all outcomes guarantees a profit regardless of the result — this is classic arbitrage.',
              'Product Reselling': 'This item is available below its current market resale value. Purchasing at retail and reselling on secondary markets like eBay or StockX captures the price difference as profit.',
              'Price Mistakes': 'Retailers occasionally list items at incorrect prices due to system errors. Many honour these prices if orders are placed before the error is corrected — acting fast is key.',
              'Discounts': 'This discount brings the price significantly below typical market rate, creating an opportunity to purchase for personal use or resale at a meaningful saving.',
            };
            const text = explanation ?? autoExplanations[opportunity.category] ?? 'Monitor this opportunity closely and verify before acting.';
            return (
              <div className="bg-accent-green/5 border border-accent-green/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={13} className="text-accent-green" />
                  <span className="text-accent-green text-xs font-mono font-bold uppercase tracking-wider">Why This Is Profitable</span>
                </div>
                <p className="text-text-secondary text-xs leading-relaxed">{text}</p>
              </div>
            );
          })()}

          {opportunity.expires_at && (
            <div className="bg-accent-red/10 border border-accent-red/20 rounded-lg p-3 flex items-center gap-2">
              <Clock size={13} className="text-accent-red" />
              <span className="text-accent-red text-xs font-mono">Expires {formatDistanceToNow(new Date(opportunity.expires_at), { addSuffix: true })}</span>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {validUrl ? (
            <a href={validUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-accent-green text-bg-primary font-display font-bold py-3 rounded-lg hover:bg-accent-green/90 transition-all text-sm">
              VIEW OPPORTUNITY <ExternalLink size={15} />
            </a>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 bg-bg-secondary border border-border-dim text-text-muted font-display font-bold py-3 rounded-lg text-sm cursor-not-allowed">
              NO SOURCE LINK <Globe size={15} />
            </div>
          )}
          <button onClick={() => onToggleSave(opportunity.id)}
            className={`px-4 py-3 rounded-lg border transition-all font-display font-bold text-sm flex items-center gap-2
              ${isSaved ? 'bg-accent-yellow/10 border-accent-yellow/30 text-accent-yellow' : 'border-border-bright text-text-secondary hover:border-accent-yellow/50 hover:text-accent-yellow'}`}>
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            {isSaved ? 'SAVED' : 'SAVE'}
          </button>
        </div>
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

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

export default function OpportunityCard({ opportunity, isSaved, onToggleSave, isNew }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const cfg = CATEGORY_CONFIG[opportunity.category] ?? CATEGORY_CONFIG['Discounts'];
  const validUrl = safeUrl(opportunity.source_url);
  const flag = REGION_FLAGS[opportunity.region] ?? '🌐';

  const profit = opportunity.estimated_profit;
  const profitStr = profit >= 1000 ? `$${(profit / 1000).toFixed(1)}K` : `$${profit.toFixed(0)}`;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    await onToggleSave(opportunity.id);
    setSaving(false);
  };

  return (
    <>
      <div
        className={`opportunity-card bg-bg-card border rounded-xl p-5 relative overflow-hidden cursor-pointer
          ${isNew ? 'border-accent-green/40 card-new animate-slide-in' : 'border-border-dim hover:border-border-bright'}`}
        onClick={() => setExpanded(true)}
      >
        {isNew && (
          <div className="absolute top-3 right-3">
            <span className="bg-accent-green text-bg-primary text-xs font-mono font-bold px-2 py-0.5 rounded-full badge-pulse">NEW</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`category-tag px-2.5 py-1 rounded-md border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} style={{ display: 'inline-block' }} />
              {opportunity.category}
            </span>
            <span className="text-xs font-mono text-text-muted bg-bg-secondary border border-border-dim px-2 py-0.5 rounded-md">
              {flag} {opportunity.region ?? 'Global'}
            </span>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-accent-green font-display font-bold text-xl glow-green leading-tight">{profitStr}–{profitMaxStr}</div>
            <div className="text-accent-green/60 text-xs font-mono">{roi.toFixed(1)}% ROI · est. profit</div>
          </div>
        </div>

        <h3 className="font-display font-bold text-white text-lg leading-tight mb-2 tracking-wide">{opportunity.title}</h3>
        <p className="text-text-secondary text-sm leading-relaxed mb-4 line-clamp-2">{opportunity.description}</p>
        <ConfidenceBar score={opportunity.confidence_score} />

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-dim">
          <div className="flex items-center gap-3 text-xs text-text-muted font-mono">
            <span className="flex items-center gap-1"><TrendingUp size={11} />{opportunity.source}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{formatDistanceToNow(new Date(opportunity.created_at), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center gap-2">
            {validUrl && (
              <a href={validUrl} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="p-1.5 text-text-muted hover:text-accent-blue transition-colors" title="View source">
                <ExternalLink size={15} />
              </a>
            )}
            <button onClick={e => { e.stopPropagation(); setExpanded(true); }}
              className="p-1.5 text-text-muted hover:text-white transition-colors" title="Expand details">
              <ChevronRight size={15} />
            </button>
            <button onClick={handleSave} disabled={saving}
              className={`p-1.5 transition-colors ${isSaved ? 'text-accent-yellow' : 'text-text-muted hover:text-accent-yellow'}`}
              title={isSaved ? 'Remove bookmark' : 'Save opportunity'}>
              {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <OpportunityModal
          opportunity={opportunity}
          isSaved={isSaved}
          onToggleSave={onToggleSave}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
