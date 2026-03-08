'use client';
import { useState, useRef } from 'react';
import { Share2, Twitter, MessageCircle, Copy, Check, X, Download } from 'lucide-react';
import type { Opportunity } from '@/types';
import { createClient } from '@/lib/supabase';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Sports Betting':    { bg: '#f9731620', text: '#f97316', border: '#f9731640' },
  'Crypto Arbitrage':  { bg: '#00aaff20', text: '#00aaff', border: '#00aaff40' },
  'Crypto Trade':      { bg: '#00ff8820', text: '#00ff88', border: '#00ff8840' },
  'Product Reselling': { bg: '#a855f720', text: '#a855f7', border: '#a855f740' },
  'Price Mistakes':    { bg: '#ff3b3b20', text: '#ff3b3b', border: '#ff3b3b40' },
  'Discounts':         { bg: '#ffd70020', text: '#ffd700', border: '#ffd70040' },
};

interface Props {
  opportunity: Opportunity;
  onClose: () => void;
}

export default function ShareCard({ opportunity, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  const profit = opportunity.estimated_profit;
  const profitStr = profit >= 1000 ? `$${(profit / 1000).toFixed(1)}K` : `$${profit.toFixed(0)}`;
  const cfg = CATEGORY_COLORS[opportunity.category] ?? CATEGORY_COLORS['Discounts'];

  const shareText = `🎯 ${opportunity.title}\n\nEst. Profit: ${profitStr} | Confidence: ${opportunity.confidence_score}/100\n\nFound on ArbitraxAI — Real-time profit opportunities\n👉 arbitraxai.vercel.app`;

  const trackShare = async () => {
    await supabase.rpc('increment_share_count', { opp_id: opportunity.id });
  };

  const shareToTwitter = () => {
    trackShare();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const shareToTelegram = () => {
    trackShare();
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://arbitraxai.vercel.app')}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const shareToWhatsApp = () => {
    trackShare();
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const copyLink = async () => {
    trackShare();
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-bg-card border border-border-bright rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-border-dim">
          <h2 className="font-display font-bold text-white flex items-center gap-2">
            <Share2 size={18} className="text-accent-green" /> Share Opportunity
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={18} /></button>
        </div>

        {/* Preview card */}
        <div className="p-5">
          <div className="rounded-xl border p-4 mb-5" style={{ background: '#0a0a0a', borderColor: cfg.border }}>
            {/* Brand */}
            <div className="flex items-center justify-between mb-3">
              <span className="font-display font-bold text-lg tracking-wider text-white">
                ARBITRAX<span style={{ color: '#00ff88' }}>AI</span>
              </span>
              <span className="text-xs font-mono px-2 py-1 rounded-md border" style={{ color: cfg.text, background: cfg.bg, borderColor: cfg.border }}>
                {opportunity.category}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-display font-bold text-white text-base leading-tight mb-2">
              {opportunity.title}
            </h3>

            {/* Stats row */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-dim">
              <div>
                <div className="text-xs text-text-muted font-mono">Est. Profit</div>
                <div className="font-display font-bold text-2xl" style={{ color: '#00ff88' }}>{profitStr}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-text-muted font-mono">Confidence</div>
                <div className="font-display font-bold text-2xl text-white">{opportunity.confidence_score}<span className="text-sm text-text-muted">/100</span></div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-muted font-mono">Source</div>
                <div className="text-sm text-text-secondary font-mono">{opportunity.source}</div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-border-dim text-center">
              <span className="text-xs text-text-muted font-mono">arbitraxai.vercel.app</span>
            </div>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={shareToTwitter}
              className="flex items-center justify-center gap-2 bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 text-[#1DA1F2] font-mono text-sm py-3 rounded-xl hover:bg-[#1DA1F2]/20 transition-all">
              <Twitter size={16} /> X / Twitter
            </button>
            <button onClick={shareToTelegram}
              className="flex items-center justify-center gap-2 bg-[#2AABEE]/10 border border-[#2AABEE]/30 text-[#2AABEE] font-mono text-sm py-3 rounded-xl hover:bg-[#2AABEE]/20 transition-all">
              <MessageCircle size={16} /> Telegram
            </button>
            <button onClick={shareToWhatsApp}
              className="flex items-center justify-center gap-2 bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] font-mono text-sm py-3 rounded-xl hover:bg-[#25D366]/20 transition-all">
              <MessageCircle size={16} /> WhatsApp
            </button>
            <button onClick={copyLink}
              className={`flex items-center justify-center gap-2 font-mono text-sm py-3 rounded-xl transition-all border
                ${copied ? 'bg-accent-green/10 border-accent-green/30 text-accent-green' : 'bg-bg-secondary border-border-dim text-text-secondary hover:text-white'}`}>
              {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Text</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
