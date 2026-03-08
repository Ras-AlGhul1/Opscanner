'use client';
import { useEffect, useState } from 'react';
import { Flame, Zap, Trophy, Share2, ThumbsUp } from 'lucide-react';
import { createClient } from '@/lib/supabase';

// Call this from OpportunityCard when user interacts (expand, save, share, rate)
export async function recordInteraction(type: 'view' | 'save' | 'share' | 'rate') {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('streak, last_active, longest_streak, share_streak, last_shared')
    .eq('id', user.id)
    .single();

  if (!profile) return;

  const updates: Record<string, unknown> = {};

  // ── Interaction streak ──────────────────────────────────────
  const lastActive = profile.last_active;
  if (lastActive !== today) {
    let newStreak = profile.streak ?? 0;
    if (lastActive === yesterday) {
      newStreak++;
    } else if (!lastActive || lastActive < yesterday) {
      newStreak = 1;
    }
    updates.streak         = newStreak;
    updates.last_active    = today;
    updates.longest_streak = Math.max(profile.longest_streak ?? 0, newStreak);
  }

  // ── Share/win streak ────────────────────────────────────────
  if (type === 'share' || type === 'rate') {
    const lastShared = profile.last_shared;
    if (lastShared !== today) {
      let newShareStreak = profile.share_streak ?? 0;
      if (lastShared === yesterday) {
        newShareStreak++;
      } else if (!lastShared || lastShared < yesterday) {
        newShareStreak = 1;
      }
      updates.share_streak = newShareStreak;
      updates.last_shared  = today;
    }
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('user_profiles').update(updates).eq('id', user.id);
  }
}

export default function StreakBanner() {
  const [streak, setStreak]       = useState(0);
  const [longest, setLongest]     = useState(0);
  const [shareStreak, setShare]   = useState(0);
  const [loading, setLoading]     = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('streak, longest_streak, share_streak')
        .eq('id', user.id)
        .single();

      if (profile) {
        setStreak(profile.streak ?? 0);
        setLongest(profile.longest_streak ?? 0);
        setShare(profile.share_streak ?? 0);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading || (!streak && !shareStreak)) return null;

  const streakColor = streak >= 7 ? '#ff6b00' : streak >= 3 ? '#ffd700' : '#00ff88';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Interaction streak */}
      {streak > 0 && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border bg-bg-card
          ${streak >= 7 ? 'border-accent-orange/40' : streak >= 3 ? 'border-accent-yellow/40' : 'border-border-dim'}`}>
          <Flame size={16} style={{ color: streakColor }} className={streak >= 3 ? 'animate-pulse' : ''} />
          <div>
            <span className="font-display font-bold text-white" style={{ color: streakColor }}>{streak}</span>
            <span className="text-text-muted text-xs font-mono ml-1">day active streak</span>
          </div>
          {streak >= 3 && (
            <div className="w-px h-4 bg-border-dim mx-1" />
          )}
          {streak >= 3 && (
            <div className="flex items-center gap-1 text-xs font-mono text-text-muted">
              <Trophy size={10} className="text-accent-yellow" /> {longest}d best
            </div>
          )}
        </div>
      )}

      {/* Share/win streak */}
      {shareStreak > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-accent-blue/30 bg-bg-card">
          <Share2 size={14} className="text-accent-blue" />
          <span className="font-display font-bold text-accent-blue">{shareStreak}</span>
          <span className="text-text-muted text-xs font-mono">day sharing streak</span>
        </div>
      )}
    </div>
  );
}
