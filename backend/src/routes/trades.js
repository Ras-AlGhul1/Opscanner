const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');
const { encrypt } = require('../services/executor');
const BinanceClient = require('../services/binance');
const BybitClient   = require('../services/bybit');

// ── Auth middleware (reuse from opportunities) ────────────────
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = data.user.id;
  next();
}

// ── GET /api/trades — trade history ──────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// ── GET /api/trades/stats — portfolio summary ─────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('pnl_usdt, net_pnl_usdt, fee_usdt, strategy, status, created_at')
      .eq('user_id', req.userId);
    if (error) throw error;

    const completed = data.filter(t => t.status === 'completed');
    const wins      = completed.filter(t => t.net_pnl_usdt > 0);
    const today     = new Date().toISOString().split('T')[0];
    const todayTrades = completed.filter(t => t.created_at?.startsWith(today));

    res.json({
      totalTrades:    data.length,
      completedTrades: completed.length,
      winRate:        completed.length ? Math.round((wins.length / completed.length) * 100) : 0,
      totalPnl:       completed.reduce((s, t) => s + (t.pnl_usdt ?? 0), 0),
      netPnl:         completed.reduce((s, t) => s + (t.net_pnl_usdt ?? 0), 0),
      totalFees:      completed.reduce((s, t) => s + (t.fee_usdt ?? 0), 0),
      todayPnl:       todayTrades.reduce((s, t) => s + (t.net_pnl_usdt ?? 0), 0),
      byStrategy: {
        triangular: completed.filter(t => t.strategy === 'triangular').reduce((s, t) => s + (t.net_pnl_usdt ?? 0), 0),
        funding:    completed.filter(t => t.strategy === 'funding').reduce((s, t) => s + (t.net_pnl_usdt ?? 0), 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET /api/trades/positions — open positions ────────────────
router.get('/positions', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', req.userId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false });
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// ── GET /api/trades/rules — get trading rules ─────────────────
router.get('/rules', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase
      .from('user_trading_rules')
      .select('*')
      .eq('user_id', req.userId)
      .single();
    res.json(data ?? null);
  } catch {
    res.json(null);
  }
});

// ── POST /api/trades/rules — save trading rules ───────────────
router.post('/rules', requireAuth, async (req, res) => {
  try {
    const { rules, binanceKey, binanceSecret, bybitKey, bybitSecret, enabled } = req.body;

    // Validate and encrypt keys
    const exchange_keys = {};
    if (binanceKey && binanceSecret) {
      const client = new BinanceClient(binanceKey, binanceSecret);
      const check  = await client.validateKeys();
      if (!check.valid) return res.status(400).json({ error: 'Invalid Binance API keys: ' + check.error });
      exchange_keys.binanceKey    = encrypt(binanceKey);
      exchange_keys.binanceSecret = encrypt(binanceSecret);
    }
    if (bybitKey && bybitSecret) {
      const client = new BybitClient(bybitKey, bybitSecret);
      const check  = await client.validateKeys();
      if (!check.valid) return res.status(400).json({ error: 'Invalid Bybit API keys: ' + check.error });
      exchange_keys.bybitKey    = encrypt(bybitKey);
      exchange_keys.bybitSecret = encrypt(bybitSecret);
    }

    const { error } = await supabase.from('user_trading_rules').upsert({
      user_id: req.userId,
      rules,
      exchange_keys,
      enabled: enabled ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message ?? 'Failed to save rules' });
  }
});

// ── POST /api/trades/rules/toggle — enable/disable ───────────
router.post('/rules/toggle', requireAuth, async (req, res) => {
  try {
    const { enabled } = req.body;
    const { error } = await supabase
      .from('user_trading_rules')
      .update({ enabled })
      .eq('user_id', req.userId);
    if (error) throw error;
    res.json({ success: true, enabled });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle' });
  }
});

// ── POST /api/trades/scan — manual scan (preview, no execute) ─
router.post('/scan', requireAuth, async (req, res) => {
  try {
    const { data: userRules } = await supabase
      .from('user_trading_rules')
      .select('exchange_keys, rules')
      .eq('user_id', req.userId)
      .single();

    if (!userRules) return res.status(400).json({ error: 'No trading rules set up' });

    const { exchange_keys: keys, rules } = userRules;
    const results = { triangular: [], funding: [] };

    const { decrypt } = require('../services/executor');
    if (keys.binanceKey) {
      const client = new BinanceClient(decrypt(keys.binanceKey), decrypt(keys.binanceSecret));
      results.triangular = await client.findTriangularOpportunities('USDT', rules.minProfitPct ?? 0.1);
    }
    if (keys.bybitKey) {
      const client = new BybitClient(decrypt(keys.bybitKey), decrypt(keys.bybitSecret));
      results.funding = await client.findFundingOpportunities(rules.minFundingRatePct ?? 0.05);
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Scan failed: ' + err.message });
  }
});

module.exports = router;
