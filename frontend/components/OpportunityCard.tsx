'use client';
import { useState, useEffect, useCallback } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, TrendingUp, Clock, Shield, Sparkles, ThumbsUp, ThumbsDown, Calculator, X, Share2, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase';
import type { Opportunity } from '@/types';
import ShareCard from './ShareCard';
import { recordInteraction } from './StreakBanner';

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  'Sports Betting':    { color: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/20', dot: 'bg-accent-orange' },
  'Crypto Arbitrage':  { color: 'text-accent-blue',   bg: 'bg-accent-blue/10',   border: 'border-accent-blue/20',   dot: 'bg-accent-blue' },
  'Crypto Trade':      { color: 'text-accent-green',  bg: 'bg-accent-green/10',  border: 'border-accent-green/20',  dot: 'bg-accent-green' },
  'Product Reselling': { color: 'text-accent-purple', bg: 'bg-accent-purple/10', border: 'border-accent-purple/20', dot: 'bg-accent-purple' },
  'Price Mistakes':    { color: 'text-accent-red',    bg: 'bg-accent-red/10',    border: 'border-accent-red/20',    dot: 'bg-accent-red' },
  'Discounts':         { color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/20', dot: 'bg-accent-yellow' },
};

// ─── Countdown Timer ──────────────────────────────────────────
function useCountdown(expiresAt?: string | null) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [expired, setExpired]   = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const expiry = new Date(expiresAt).getTime();

    const tick = () => {
      const diff = expiry - Date.now();
      if (diff <= 0) { setExpired(true); setTimeLeft(0); }
      else setTimeLeft(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return { timeLeft, expired };
}

function formatCountdown(ms: number): { text: string; urgent: boolean } {
  const totalSecs = Math.floor(ms / 1000);
  const mins      = Math.floor(totalSecs / 60);
  const secs      = totalSecs % 60;
  const hours     = Math.floor(mins / 60);
  const remMins   = mins % 60;

  if (hours > 0) return { text: `${hours}h ${remMins}m`, urgent: hours < 1 };
  if (mins > 0)  return { text: `${mins}m ${secs}s`,     urgent: mins < 5 };
  return             { text: `${secs}s`,                 urgent: true };
}

function CountdownBadge({ expiresAt }: { expiresAt?: string | null }) {
  const { timeLeft, expired } = useCountdown(expiresAt);
  if (!expiresAt || timeLeft === null) return null;
  if (expired) return (
    <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-red-900/30 text-accent-red border border-accent-red/30">
      <Clock size={10} /> EXPIRED
    </span>
  );
  const { text, urgent } = formatCountdown(timeLeft);
  return (
    <span className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full border
      ${urgent
        ? 'bg-accent-red/10 text-accent-red border-accent-red/30 animate-pulse'
        : 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/30'}`}>
      <Clock size={10} /> {text}
    </span>
  );
}

// ─── Profit Calculator ────────────────────────────────────────
function ProfitCalculator({ opportunity, onClose }: { opportunity: Opportunity; onClose: () => void }) {
  const [stake, setStake] = useState('1000');
  const meta     = opportunity.metadata as any || {};
  const calcType = meta.calcType  || 'pct';
  const calcVal  = meta.calcValue || 0;

  const stakeNum = parseFloat(stake) || 0;
  let profit = 0;
  if (calcType === 'pct')   profit = stakeNum * calcVal / 100;
  if (calcType === 'fixed') profit = calcVal;

  const roi = stakeNum > 0 ? ((profit / stakeNum) * 100).toFixed(2) : '0.00';

  return (
    <div className="mt-3 p-4 bg-bg-secondary border border-accent-green/20 rounded-lg space-y-3" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="text-accent-green text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Calculator size={12} /> Profit Calculator
        </span>
        <button onClick={onClose} className="text-text-muted hover:text-white"><X size={14} /></button>
      </div>
      <div>
        <label className="text-text-muted text-xs font-mono mb-1 block">Your Stake ($)</label>
        <input
          type="number"
          value={stake}
          onChange={e => setStake(e.target.value)}
          className="w-full bg-bg-primary border border-border-dim text-white text-sm font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-accent-green/50"
          placeholder="1000"
          min="0"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-primary border border-border-dim rounded-lg p-3 text-center">
          <div className="text-text-muted text-xs font-mono mb-1">Est. Profit</div>
          <div className="text-accent-green font-display font-bold text-xl">
            ${profit >= 1000 ? `${(profit / 1000).toFixed(2)}K` : profit.toFixed(2)}
          </div>
        </div>
        <div className="bg-bg-primary border border-border-dim rounded-lg p-3 text-center">
          <div className="text-text-muted text-xs font-mono mb-1">ROI</div>
          <div className="text-accent-blue font-display font-bold text-xl">{roi}%</div>
        </div>
      </div>
      <p className="text-text-muted text-xs font-mono">* Estimates only. Always verify before acting.</p>
      {/* Share modal */}
      {showShare && <ShareCard opportunity={opportunity} onClose={() => setShowShare(false)} />}
    </div>
  );
}

// ─── Confidence bar ───────────────────────────────────────────
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
      {/* Share modal */}
      {showShare && <ShareCard opportunity={opportunity} onClose={() => setShowShare(false)} />}
    </div>
  );
}

// ─── Fallback explanation ─────────────────────────────────────
function getFallbackExplanation(opp: Opportunity): string {
  const meta = (opp as any).metadata || {};
  switch (opp.category) {
    case 'Sports Betting':
      if (meta.type === 'arbitrage') return `By placing bets on both sides across ${meta.bookA} and ${meta.bookB}, the differing odds create a mathematical guarantee of profit regardless of the result.`;
      if (meta.type === 'over_under') return `Over/Under bets profit when you correctly predict the combined scoring output. Current odds and recent form strongly point toward the ${meta.direction}.`;
      return `This prediction is based on live odds data showing a statistical edge. The model identified a pricing discrepancy creating positive expected value.`;
    case 'Crypto Arbitrage':
      return `${meta.pair || 'This crypto pair'} is priced differently across exchanges. Buying on ${meta.exA || 'one exchange'} and selling on ${meta.exB || 'another'} captures the spread as profit. These gaps close within minutes.`;
    case 'Crypto Trade':
      if (meta.tradeType === 'trend_follow') return `${meta.coin} is showing a strong momentum move. Trend-following strategies enter in the direction of momentum and exit when the trend weakens.`;
      if (meta.tradeType === 'dip_buy')      return `${meta.coin} has dropped significantly and is approaching a historically strong support level. Dip-buying during oversold conditions can capture upside on recovery.`;
      if (meta.tradeType === 'breakout')     return `${meta.coin} is breaking out with strong momentum. Breakouts with volume confirmation often lead to sustained moves in the breakout direction.`;
      return `This crypto trade signal is based on live price action and volume data.`;
    case 'Product Reselling':
      return `This item is priced below its true market value. Buying at this price and reselling on eBay or StockX where demand keeps prices higher captures the difference as profit.`;
    case 'Price Mistakes':
      return `A pricing error means the retailer accidentally listed this far below its actual value. Many retailers honour these prices if orders are placed before the error is corrected.`;
    case 'Discounts':
      return `This deal is verified below-market price. Profit comes from savings versus paying full price elsewhere, or buying to resell at the standard retail price.`;
    default:
      return `This opportunity was identified based on a real market signal. Acting quickly before the market corrects gives you the best chance of capturing the profit.`;
  }
}

// ─── Rating ───────────────────────────────────────────────────
function RatingButtons({ opportunityId, onRate }: { opportunityId: string; onRate: (id: string, rating: 'up' | 'down') => void }) {
  const [rated, setRated] = useState<'up' | 'down' | null>(null);

  const handleRate = (e: React.MouseEvent, rating: 'up' | 'down') => {
    e.stopPropagation();
    if (rated) return;
    setRated(rating);
    onRate(opportunityId, rating);
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-text-muted text-xs font-mono mr-1">Rate:</span>
      <button
        onClick={e => handleRate(e, 'up')}
        className={`p-1 rounded transition-colors ${rated === 'up' ? 'text-accent-green' : 'text-text-muted hover:text-accent-green'}`}
        title="Worked for me"
      >
        <ThumbsUp size={13} />
      </button>
      <button
        onClick={e => handleRate(e, 'down')}
        className={`p-1 rounded transition-colors ${rated === 'down' ? 'text-accent-red' : 'text-text-muted hover:text-accent-red'}`}
        title="Didn't work"
      >
        <ThumbsDown size={13} />
      </button>
      {/* Share modal */}
      {showShare && <ShareCard opportunity={opportunity} onClose={() => setShowShare(false)} />}
    </div>
  );
}

// ─── Main Card ────────────────────────────────────────────────
interface Props {
  opportunity: Opportunity;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  isNew?: boolean;
  onExpired?: (id: string) => void;
}

export default function OpportunityCard({ opportunity, isSaved, onToggleSave, isNew, onExpired }: Props) {
  const [saving, setSaving]         = useState(false);
  const [expanded, setExpanded]     = useState(false);
  const [showCalc, setShowCalc]     = useState(false);
  const [rated, setRated]           = useState<'up' | 'down' | null>(null);
  const [showShare, setShowShare]   = useState(false);
  const { expired }                 = useCountdown(opportunity.expires_at);
  const cfg = CATEGORY_CONFIG[opportunity.category] ?? CATEGORY_CONFIG['Discounts'];

  // Notify parent when expired so it can remove from list
  useEffect(() => {
    if (expired && onExpired) onExpired(opportunity.id);
  }, [expired]);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    await onToggleSave(opportunity.id);
    recordInteraction('save');
    setSaving(false);
  };

  const handleRate = useCallback((_id: string, rating: 'up' | 'down') => {
    setRated(rating);
    recordInteraction('rate');
    console.log(`Rated ${_id}: ${rating}`);
  }, []);

  const explanation = (opportunity as any).explanation || getFallbackExplanation(opportunity);
  const profit      = opportunity.estimated_profit;
  const profitStr   = profit >= 1000 ? `$${(profit / 1000).toFixed(1)}K` : `$${profit.toFixed(0)}`;

  // Don't render if expired (parent handles removal with a fade)
  if (expired) return null;

  return (
    <div
      onClick={() => { setExpanded(!expanded); if (!expanded) recordInteraction('view'); }}
      className={`
        opportunity-card bg-bg-card border rounded-xl p-5 relative overflow-hidden cursor-pointer
        transition-all duration-200
        ${isNew      ? 'border-accent-green/40 animate-slide-in' : 'border-border-dim hover:border-border-bright'}
        ${expanded   ? 'border-accent-green/30' : ''}
      `}
    >
      {/* New badge */}
      {isNew && (
        <div className="absolute top-3 right-3">
          <span className="bg-accent-green text-bg-primary text-xs font-mono font-bold px-2 py-0.5 rounded-full badge-pulse">NEW</span>
        </div>
      )}
      {/* Hot badge */}
      {!isNew && (opportunity as any).share_count >= 3 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-accent-orange/20 border border-accent-orange/30 text-accent-orange text-xs font-mono font-bold px-2 py-0.5 rounded-full">
          <Flame size={10} /> HOT
        </div>
      )}

      {/* Top row: category + profit */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`category-tag px-2.5 py-1 rounded-md border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} style={{ display: 'inline-block' }} />
            {opportunity.category}
          </span>
          {/* Countdown timer */}
          <CountdownBadge expiresAt={opportunity.expires_at} />
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

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-3 mb-4" onClick={e => e.stopPropagation()}>
          {/* Why profitable */}
          <div className="rounded-lg border border-accent-green/20 bg-accent-green/5 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={13} className="text-accent-green" />
              <span className="text-accent-green text-xs font-mono font-bold uppercase tracking-wider">Why This Is Profitable</span>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">{explanation}</p>
          </div>

          {/* Profit calculator */}
          {showCalc ? (
            <ProfitCalculator opportunity={opportunity} onClose={() => setShowCalc(false)} />
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setShowCalc(true); }}
              className="w-full flex items-center justify-center gap-2 border border-border-dim text-text-muted hover:text-white hover:border-accent-green/40 text-xs font-mono py-2 rounded-lg transition-all"
            >
              <Calculator size={13} /> Calculate my profit
            </button>
          )}

          {/* Rating */}
          <div className="flex items-center justify-between pt-2 border-t border-border-dim">
            <span className="text-text-muted text-xs font-mono">Did this work for you?</span>
            <RatingButtons opportunityId={opportunity.id} onRate={handleRate} />
            {rated && (
              <span className={`text-xs font-mono ${rated === 'up' ? 'text-accent-green' : 'text-accent-red'}`}>
                {rated === 'up' ? '👍 Thanks!' : '👎 Noted'}
              </span>
            )}
          </div>
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
              onClick={e => e.stopPropagation()}
              className="p-1.5 text-text-muted hover:text-accent-blue transition-colors"
              title="View source"
            >
              <ExternalLink size={15} />
            </a>
          )}
          <button
            onClick={e => { e.stopPropagation(); setShowShare(true); recordInteraction('share'); }}
            className="p-1.5 text-text-muted hover:text-accent-blue transition-colors"
            title="Share"
          >
            <Share2 size={15} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`p-1.5 transition-colors ${isSaved ? 'text-accent-yellow' : 'text-text-muted hover:text-accent-yellow'}`}
          >
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
        </div>
      </div>
      {/* Share modal */}
      {showShare && <ShareCard opportunity={opportunity} onClose={() => setShowShare(false)} />}
    </div>
  );
}
